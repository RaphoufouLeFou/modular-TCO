#include "packets_serial.hpp"

uint8_t fetch_packet(uint8_t* packet_buffer, uint8_t buffer_size)
{
    int waiting_bytes = Serial.available();
    if (waiting_bytes <= 0)
    {
        return 0;
    }

    packet_header header;
    Serial.readBytes(&header, sizeof(header));
  
    if(buffer_size < header.size)
    {
        return 0;
    }

    Serial.readBytes(packet_buffer, buffer_size);
  
    // TODO: check for discovery packets
    if (header.id != this.id)
    {
        return 0;
    }

    // Switch case with all packets types.
}

void send_packet(uint8_t* packet, uint8_t packet_size)
{
    Serial.write(packet, packet_size);
    Serial.flush();
}
