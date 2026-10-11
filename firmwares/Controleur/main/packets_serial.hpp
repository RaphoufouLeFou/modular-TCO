#pragma once

#include "packets.hpp"

void init_packet_serial();

uint8_t fetch_packet(uint8_t device_id, uint8_t *packet_buffer,
                     uint8_t buffer_size, PacketHeader &res_header);

void send_packet(uint8_t device_id, uint8_t *packet, uint8_t packet_size);
