#include "packets_serial.hpp"

#include "Arduino.h"
#include "config.hpp"
#include "packets.hpp"

uint8_t fetch_packet(uint8_t *packet_buffer, uint8_t buffer_size,
                     PacketHeader &res_header)
{
    while (Serial.available() > 0 && Serial.peek() != PACKET_SYNC)
    {
        Serial.read();
    }

    if (Serial.available() < (int)(1 + sizeof(PacketHeader)))
    {
        return UINT8_ERROR;
    }
    Serial.read(); // consume the sync byte

    if (Serial.readBytes((uint8_t *)&res_header, sizeof(PacketHeader))
        != sizeof(PacketHeader))
    {
        return UINT8_ERROR;
    }

    if (res_header.size > buffer_size)
    {
        return UINT8_ERROR;
    }

    if (res_header.size > 0
        && Serial.readBytes(packet_buffer, res_header.size) != res_header.size)
    {
        return UINT8_ERROR;
    }

    const uint8_t received = res_header.checksum;
    res_header.checksum = 0;
    uint8_t crc =
        Packet::Crc8((const uint8_t *)&res_header, sizeof(PacketHeader));
    crc = Packet::Crc8(packet_buffer, res_header.size, crc);
    res_header.checksum = received;

    if (crc != received)
    {
        return UINT8_ERROR;
    }

    if (res_header.ID != id_ && res_header.type != PacketType::DISCOVERY
        && res_header.type != PacketType::ASSIGNMENT)
    {
        return UINT8_ERROR;
    }

    return res_header.size;
}

void send_packet(uint8_t *packet, uint8_t packet_size)
{
    Serial.write(PACKET_SYNC);
    Serial.write(packet, packet_size);
    Serial.flush();
}
