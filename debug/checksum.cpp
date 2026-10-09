#include <iostream>

#include "../firmwares/CommonLib/packets.hpp"

int main()
{
    constexpr int header_len = 4;
    constexpr int data_len = 5;
    /*
    uint8_t buffer[header_len + data_len] = { 0x01, 0x05, 0x00, 0x00, 0x00,
                                              0xc0, 0x07, 0x1f, 0x42 };
*/

    /*
    uint8_t buffer[header_len + data_len] = { 0x03, 0x05, 0x41, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00 };
    */
    uint8_t buffer[header_len + data_len] = { 0x03, 0x05, 0x42, 0x00, 0x05,
                                              0xC8, 0xF0, 0x00, 0x00 };

    uint res = Packet::Crc8(buffer, header_len + data_len);

    std::cout << std::hex << res << std::endl;
    return 0;
}
