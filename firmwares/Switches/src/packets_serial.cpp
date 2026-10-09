#include "packets_serial.hpp"

#include "Arduino.h"
#include "config.hpp"
#include "packets.hpp"

void serialFlush()
{
    while (Serial.available() > 0)
    {
        char t = Serial.read();
    }
}

uint8_t fetch_packet(uint8_t *packet_buffer, uint8_t buffer_size,
                     PacketHeader &res_header)
{
    int waiting_bytes = Serial.available();
    if (waiting_bytes <= 0)
    {
        return UINT8_ERROR;
    }

    size_t byte_read =
        Serial.readBytes((uint8_t *)&res_header, sizeof(PacketHeader));

    if (buffer_size < res_header.size || byte_read < sizeof(PacketHeader))
    {
        serialFlush();
        return UINT8_ERROR;
    }

    byte_read = Serial.readBytes(packet_buffer, res_header.size);

    serialFlush();

    if (res_header.ID != id_ && res_header.type != PacketType::DISCOVERY
        && res_header.type != PacketType::ASSIGNMENT)
    {
        return UINT8_ERROR;
    }

    return byte_read;
}

void send_packet(uint8_t *packet, uint8_t packet_size)
{
    Serial.write(packet, packet_size);
    Serial.flush();
}
