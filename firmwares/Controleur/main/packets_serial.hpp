#pragma once

#include <cstddef>
#include <cstdint>
#include <cstring>

#include "config.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "packets.hpp"

static const char *TAG_SERIAL = "SERIAL";

void init_packet_serial();

uint8_t fetch_packet(uint8_t device_id, uint8_t *packet_buffer,
                     uint8_t buffer_size, PacketHeader &res_header,
                     TickType_t timeout);

void send_packet(uint8_t device_id, const uint8_t *packet, uint8_t packet_size);

void port_lock(uint8_t device_id);
void port_unlock(uint8_t device_id);

struct PortLock
{
    explicit PortLock(uint8_t device_id)
        : device_(device_id)
    {
        port_lock(device_);
    }
    ~PortLock()
    {
        port_unlock(device_);
    }
    PortLock(const PortLock &) = delete;
    PortLock &operator=(const PortLock &) = delete;

private:
    uint8_t device_;
};

template <typename T>
uint8_t exchange_packet(const T &packet, uint8_t device_id,
                        uint8_t *packet_buffer, uint8_t buffer_size,
                        PacketHeader &res_header)
{
    constexpr uint8_t len = sizeof(PacketHeader) + sizeof(T);
    static_assert(len <= PACKET_BUFFER_SIZE, "packet too big");
    uint8_t buffer[len];

    PacketHeader h;
    h.type = T::Type;
    h.size = sizeof(T);
    h.ID = device_id;
    h.checksum = 0;

    memcpy(buffer, &h, sizeof(PacketHeader));
    memcpy(buffer + sizeof(PacketHeader), &packet, sizeof(T));
    buffer[offsetof(PacketHeader, checksum)] = Packet::Crc8(buffer, len);

    PortLock lock(device_id);

    send_packet(device_id, buffer, len);

    const uint8_t res =
        fetch_packet(device_id, packet_buffer, buffer_size, res_header,
                     pdMS_TO_TICKS(PACKET_TIMEOUT_MS));
    if (res == UINT8_ERROR)
    {
        ESP_LOGW(TAG_SERIAL, "Packet %d (%u bytes) to device %d timed out",
                 (int)T::Type, (unsigned)sizeof(T), device_id);
    }
    return res;
}
