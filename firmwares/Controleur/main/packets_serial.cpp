#include "packets_serial.hpp"

#include "config.h"
#include "driver/gpio.h"
#include "driver/uart.h"
#include "packets.hpp"

const int ports_uart = UART_NUM_2;
const int tco_uart = UART_NUM_1;

void init_packet_serial()
{
    ESP_ERROR_CHECK(uart_set_pin(ports_uart, PORT_S_TX, PORT_S_RX,
                                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));

    ESP_ERROR_CHECK(uart_set_pin(tco_uart, PORT_TCO0_TX, PORT_TCO0_RX,
                                 UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE));

    gpio_set_direction((gpio_num_t)PORT_S0, GPIO_MODE_OUTPUT);
    gpio_set_direction((gpio_num_t)PORT_S1, GPIO_MODE_OUTPUT);
    gpio_set_direction((gpio_num_t)PORT_S2, GPIO_MODE_OUTPUT);
    gpio_set_direction((gpio_num_t)PORT_S3, GPIO_MODE_OUTPUT);
}

inline void set_mux_port(uint8_t device_id)
{
    if (!IS_TCO(device_id))
    {
        gpio_set_level((gpio_num_t)PORT_S0, (device_id >> 0) & 1);
        gpio_set_level((gpio_num_t)PORT_S1, (device_id >> 1) & 1);
        gpio_set_level((gpio_num_t)PORT_S2, (device_id >> 2) & 1);
        gpio_set_level((gpio_num_t)PORT_S3, (device_id >> 3) & 1);
    }
}

uint8_t fetch_packet(uint8_t device_id, uint8_t *packet_buffer,
                     uint8_t buffer_size, PacketHeader &res_header)
{
    int p = IS_TCO(device_id) ? tco_uart : ports_uart;

    set_mux_port(device_id);

    size_t waiting_bytes = 0;
    ESP_ERROR_CHECK(uart_get_buffered_data_len(p, &waiting_bytes));
    if (waiting_bytes <= 0)
        return UINT8_ERROR;

    size_t byte_read = uart_read_bytes(p, &res_header, sizeof(PacketHeader),
                                       pdMS_TO_TICKS(PACKET_TIMEOUT_MS));

    if (buffer_size < res_header.size || byte_read < sizeof(PacketHeader))
    {
        uart_flush(p);
        return UINT8_ERROR;
    }

    byte_read = uart_read_bytes(p, packet_buffer, res_header.size,
                                pdMS_TO_TICKS(PACKET_TIMEOUT_MS));
    uart_flush(p);

    return byte_read;
}

void send_packet(uint8_t device_id, uint8_t *packet, uint8_t packet_size)
{
    int p = IS_TCO(device_id) ? tco_uart : ports_uart;

    // we prepare this to be rdy to reicv the resp as soon as we send the packet
    set_mux_port(device_id);

    uart_write_bytes(p, packet, packet_size);
    ESP_ERROR_CHECK(uart_wait_tx_done(p, pdMS_TO_TICKS(PACKET_TIMEOUT_MS)));
}
