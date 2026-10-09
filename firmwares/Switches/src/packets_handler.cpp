#include "packets_handler.hpp"

#include <stdint.h>

#include "config.hpp"
#include "light_signal.hpp"
#include "motor.hpp"
#include "packets.hpp"
#include "packets_serial.hpp"
#include "utils.hpp"

uint32_t UUID = 0;

Motor motor;
LightSignal signal0(18, 17, 16, 15, 14);
LightSignal signal1(5, 6, 3, 19);
LightSignal signal2(10, 8, 9, 7);

Motor *get_motor()
{
    return &motor;
}

LightSignal *get_signal0()
{
    return &signal0;
}
LightSignal *get_signal1()
{
    return &signal1;
}
LightSignal *get_signal2()
{
    return &signal2;
}

void handle_discovery(PacketHeader header, uint8_t *packet_buffer,
                      uint8_t buffer_size)
{
    if (UUID == 0)
    {
        UUID = generateTrueHardwareSeed();
    }

    return_packet(IdentificationPacket{ UUID });
}

void handle_assignment(PacketHeader header, uint8_t *packet_buffer,
                       uint8_t buffer_size)
{
    if (buffer_size < sizeof(AssignmentPacket))
    {
        return_packet(StatusPacket{ StatusType::ERROR });
        return;
    }

    AssignmentPacket p;
    p = *(AssignmentPacket *)packet_buffer;

    if (p.UUID != UUID)
    {
        return;
    }

    id_ = p.NewModuleID;
    signal0.set_id(id_ * 3 + 0);
    signal1.set_id(id_ * 3 + 1);
    signal2.set_id(id_ * 3 + 2);

    return_packet(StatusPacket{ StatusType::OK });
}

void handle_heartbeat(PacketHeader header, uint8_t *packet_buffer,
                      uint8_t buffer_size)
{
    if (header.ID != id_)
    {
        return;
    }
    return_packet(StatusPacket{ StatusType::OK });
}

void handle_order(PacketHeader header, uint8_t *packet_buffer,
                  uint8_t buffer_size)
{
    if (buffer_size < sizeof(OrderPacket))
    {
        return_packet(StatusPacket{ StatusType::ERROR });
        return;
    }

    OrderPacket p;
    p = *(OrderPacket *)packet_buffer;

    switch (p.Order)
    {
    case OrderType::MOVE_PLUS:
    case OrderType::MOVE_MINUS:
        return_packet(StatusPacket{ motor.order_movement(p.Order) });
        return;
    case OrderType::SET_MOTOR_BOUNDS:
        return_packet(StatusPacket{ motor.set_bounds(p.OrderValue) });
        return;
    case OrderType::SET_MOTOR_SPEED:
        return_packet(StatusPacket{ motor.set_speed(p.OrderValue) });
        return;
    case OrderType::SET_LIGHT_BRIGHTNESS:
        break;
    case OrderType::CHANGE_LIGHT:
        signal0.set_signal_lights(p.OrderValue);
        signal1.set_signal_lights(p.OrderValue);
        signal2.set_signal_lights(p.OrderValue);
        break;
    case OrderType::SET_POWER_LEVEL:
        return_packet(StatusPacket{ StatusType::UNKNOWN_COMMAND_ERROR });
        return;
    default:
        return_packet(StatusPacket{ StatusType::UNKNOWN_COMMAND_ERROR });
        return;
    }
    return_packet(StatusPacket{ StatusType::OK });
}

void handle_fetch(PacketHeader header, uint8_t *packet_buffer,
                  uint8_t buffer_size)
{
    if (buffer_size < sizeof(FetchPacket))
    {
        return_packet(StatusPacket{ StatusType::ERROR });
        return;
    }

    FetchPacket p;
    p = *(FetchPacket *)packet_buffer;

    return_packet(InfoPacket{ motor.get_state() });
}

void handle_board(PacketHeader header, uint8_t *packet_buffer,
                  uint8_t buffer_size)
{
    return_packet(StatusPacket{ StatusType::UNKNOWN_COMMAND_ERROR });
}

void fetch_serial()
{
    uint8_t buffer[PACKET_BUFFER_SIZE];
    PacketHeader res_header;

    uint8_t read = fetch_packet(buffer, PACKET_BUFFER_SIZE, res_header);
    if (read == UINT8_ERROR)
    {
        return;
    }

    // check the checksum
    const uint8_t received = res_header.checksum;
    res_header.checksum = 0;
    uint8_t crc = Packet::Crc8((uint8_t *)(&res_header), sizeof(PacketHeader));
    crc = Packet::Crc8(buffer, read, crc);

    if (crc != received)
    {
        return_packet(StatusPacket{ StatusType::CHECKSUM_ERROR });
        return;
    }

    switch (res_header.type)
    {
    case PacketType::DISCOVERY:
        handle_discovery(res_header, buffer, PACKET_BUFFER_SIZE);
        break;
    case PacketType::ASSIGNMENT:
        handle_assignment(res_header, buffer, PACKET_BUFFER_SIZE);
        break;
    case PacketType::HEARTBEAT:
        handle_heartbeat(res_header, buffer, PACKET_BUFFER_SIZE);
        break;
    case PacketType::ORDER:
        handle_order(res_header, buffer, PACKET_BUFFER_SIZE);
        break;
    case PacketType::FETCH:
        handle_fetch(res_header, buffer, PACKET_BUFFER_SIZE);
        break;
    case PacketType::BOARD:
        handle_board(res_header, buffer, PACKET_BUFFER_SIZE);
        break;
    default:
        return_packet(StatusPacket{ StatusType::UNKNOWN_COMMAND_ERROR });
        break;
    }
}
