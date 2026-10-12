#ifndef _PACKETS_HANDLER_H_
#define _PACKETS_HANDLER_H_

#include <stdint.h>

#include "config.hpp"
#include "light_signal.hpp"
#include "motor.hpp"
#include "packets.hpp"
#include "packets_serial.hpp"

Motor *get_motor();
LightSignal *get_signal0();
LightSignal *get_signal1();
LightSignal *get_signal2();

void handle_discovery(PacketHeader header, uint8_t *packet_buffer,
                      uint8_t buffer_size);

void handle_assignment(PacketHeader header, uint8_t *packet_buffer,
                       uint8_t buffer_size);

void handle_heartbeat(PacketHeader header, uint8_t *packet_buffer,
                      uint8_t buffer_size);

void handle_order(PacketHeader header, uint8_t *packet_buffer,
                  uint8_t buffer_size);

void handle_fetch(PacketHeader header, uint8_t *packet_buffer,
                  uint8_t buffer_size);

void handle_board(PacketHeader header, uint8_t *packet_buffer,
                  uint8_t buffer_size);

template <typename T>
void return_packet(const T &packet)
{
    constexpr uint8_t len = sizeof(PacketHeader) + sizeof(T);
    static_assert(len <= PACKET_BUFFER_SIZE, "packet too big");
    uint8_t buffer[len];

    PacketHeader h;
    h.type = T::Type;
    h.size = sizeof(T);
    h.ID = id_;
    h.checksum = 0;

    memcpy(buffer, &h, sizeof(PacketHeader));
    memcpy(buffer + sizeof(PacketHeader), &packet, sizeof(T));

    buffer[offsetof(PacketHeader, checksum)] = Packet::Crc8(buffer, len);
    send_packet(buffer, len);
}

void fetch_serial();

#endif // _PACKETS_HANDLER_H_
