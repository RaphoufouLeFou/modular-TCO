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
void return_packet(T packet)
{
    uint8_t buffer[PACKET_BUFFER_SIZE];

    constexpr uint8_t len = sizeof(T) + sizeof(PacketHeader);

    PacketHeader h;
    h.type = packet.Type;
    h.size = sizeof(T);
    h.ID = id_;

    memcpy(buffer, &h, sizeof(PacketHeader));
    memcpy(buffer + sizeof(PacketHeader), &packet, len);

    buffer[offsetof(PacketHeader, checksum)] = Packet::Crc8(buffer, len);
    send_packet(buffer, len);
}

void fetch_serial();

#endif // _PACKETS_HANDLER_H_
