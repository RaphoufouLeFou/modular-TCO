#include "packets_serial.hpp"

#include "config.h"
#include "driver/gpio.h"
#include "driver/uart.h"
#include "freertos/semphr.h"
#include "packets.hpp"

static const uart_port_t ports_uart = UART_NUM_2;
static const uart_port_t tco_uart = UART_NUM_1;

static SemaphoreHandle_t port_mutex[2] = { nullptr, nullptr };
static int current_mux = -1;

static uart_port_t port_of(uint8_t device_id)
{
    return IS_TCO(device_id) ? tco_uart : ports_uart;
}

void port_lock(uint8_t device_id)
{
    xSemaphoreTake(port_mutex[IS_TCO(device_id) ? 1 : 0], portMAX_DELAY);
}

void port_unlock(uint8_t device_id)
{
    xSemaphoreGive(port_mutex[IS_TCO(device_id) ? 1 : 0]);
}

void init_packet_serial()
{
    printf("[UART INIT] Initialisation des ports UART...\n");

    port_mutex[0] = xSemaphoreCreateMutex();
    port_mutex[1] = xSemaphoreCreateMutex();

    const gpio_num_t mux_pins[] = { (gpio_num_t)PORT_S0, (gpio_num_t)PORT_S1,
                                    (gpio_num_t)PORT_S2, (gpio_num_t)PORT_S3 };
    for (gpio_num_t pin : mux_pins)
    {
        gpio_set_level(pin, 0);
        gpio_set_direction(pin, GPIO_MODE_OUTPUT);
    }
    current_mux = 0;

    uart_config_t uart_config = {
        .baud_rate = 9600,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
    };

    ESP_ERROR_CHECK(uart_param_config(ports_uart, &uart_config));
    ESP_ERROR_CHECK(uart_param_config(tco_uart, &uart_config));

    ESP_ERROR_CHECK(uart_set_pin(ports_uart, PORT_S_TX, PORT_S_RX,
                                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));
    ESP_ERROR_CHECK(uart_set_pin(tco_uart, PORT_TCO0_TX, PORT_TCO0_RX,
                                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));

    // Idle RX lines stay high instead of reading noise as 0x00 bytes
    gpio_set_pull_mode((gpio_num_t)PORT_S_RX, GPIO_PULLUP_ONLY);
    gpio_set_pull_mode((gpio_num_t)PORT_TCO0_RX, GPIO_PULLUP_ONLY);

    ESP_ERROR_CHECK(
        uart_driver_install(ports_uart, UART_BUFFER_SIZE, 0, 0, NULL, 0));
    ESP_ERROR_CHECK(
        uart_driver_install(tco_uart, UART_BUFFER_SIZE, 0, 0, NULL, 0));

    printf("[UART INIT] Pilotes UART installés avec succès.\n");
}

static void select_mux(uint8_t device_id)
{
    if (IS_TCO(device_id) || current_mux == device_id)
    {
        return;
    }

    gpio_set_level((gpio_num_t)PORT_S0, (device_id >> 0) & 1);
    gpio_set_level((gpio_num_t)PORT_S1, (device_id >> 1) & 1);
    gpio_set_level((gpio_num_t)PORT_S2, (device_id >> 2) & 1);
    gpio_set_level((gpio_num_t)PORT_S3, (device_id >> 3) & 1);
    current_mux = device_id;

    vTaskDelay(1);
}

void send_packet(uint8_t device_id, const uint8_t *packet, uint8_t packet_size)
{
    const uart_port_t p = port_of(device_id);

    select_mux(device_id);

    // Drop stale bytes: a late reply to a previous request, mux glitches...
    uart_flush_input(p);

    ESP_LOGI(TAG_SERIAL, ">>> device %d", device_id);
    ESP_LOG_BUFFER_HEX_LEVEL(TAG_SERIAL, packet, packet_size, ESP_LOG_INFO);

    const uint8_t sync = PACKET_SYNC;
    uart_write_bytes(p, &sync, 1);
    uart_write_bytes(p, packet, packet_size);

    if (uart_wait_tx_done(p, pdMS_TO_TICKS(100)) != ESP_OK)
    {
        ESP_LOGW(TAG_SERIAL, "TX timeout on device %d", device_id);
    }
}

uint8_t fetch_packet(uint8_t device_id, uint8_t *packet_buffer,
                     uint8_t buffer_size, PacketHeader &res_header,
                     TickType_t timeout)
{
    const uart_port_t p = port_of(device_id);
    const TickType_t start = xTaskGetTickCount();

    while ((xTaskGetTickCount() - start) < timeout)
    {
        const TickType_t left = timeout - (xTaskGetTickCount() - start);

        uint8_t b = 0;
        if (uart_read_bytes(p, &b, 1, left) != 1)
        {
            break;
        }
        if (b != PACKET_SYNC)
        {
            continue;
        }

        if (uart_read_bytes(p, &res_header, sizeof(PacketHeader),
                            pdMS_TO_TICKS(20))
            != (int)sizeof(PacketHeader))
        {
            continue;
        }
        if (res_header.size > buffer_size)
        {
            ESP_LOGW(TAG_SERIAL, "Bogus size %d from device %d",
                     res_header.size, device_id);
            continue;
        }

        if (res_header.size > 0
            && uart_read_bytes(p, packet_buffer, res_header.size,
                               pdMS_TO_TICKS(20 + 2 * res_header.size))
                != (int)res_header.size)
        {
            ESP_LOGW(TAG_SERIAL, "Truncated packet from device %d", device_id);
            continue;
        }

        const uint8_t received = res_header.checksum;
        res_header.checksum = 0;
        uint8_t crc =
            Packet::Crc8((const uint8_t *)&res_header, sizeof(PacketHeader));
        crc = Packet::Crc8(packet_buffer, res_header.size, crc);
        res_header.checksum = received;

        ESP_LOGI(TAG_SERIAL, "<<< device %d", device_id);
        ESP_LOG_BUFFER_HEX_LEVEL(TAG_SERIAL, &res_header, sizeof(PacketHeader),
                                 ESP_LOG_INFO);
        if (res_header.size > 0)
        {
            ESP_LOG_BUFFER_HEX_LEVEL(TAG_SERIAL, packet_buffer, res_header.size,
                                     ESP_LOG_INFO);
        }

        if (crc != received)
        {
            ESP_LOGW(TAG_SERIAL,
                     "Checksum error from device %d (0x%02x vs 0x%02x)",
                     device_id, received, crc);
            continue;
        }

        return res_header.size;
    }

    return UINT8_ERROR;
}
