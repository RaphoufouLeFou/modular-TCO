#ifndef _PACKETS_SERIAL_H_
#define _PACKETS_SERIAL_H_

// returns the read size. 0 if no packet recived
uint8_t fetch_packet(uint8_t* packet_buffer, uint8_t buffer_size);

void send_packet(void* packet, uint8_t packet_size);

#endif // _PACKETS_SERIAL_H_
