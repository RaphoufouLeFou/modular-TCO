#ifndef _PACKETS_SERIAL_H_
#define _PACKETS_SERIAL_H_

#include <stddef.h>
#include <stdint.h>

#include "packets.hpp"

// returns the read size. UINT8_ERROR if no packet recived

uint8_t fetch_packet(uint8_t *packet_buffer, uint8_t buffer_size,
                     PacketHeader &res_header);

void send_packet(uint8_t *packet, uint8_t packet_size);

#endif // _PACKETS_SERIAL_H_
