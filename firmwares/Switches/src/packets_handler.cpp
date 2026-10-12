#include "packets_handler.hpp"

#include <stdint.h>
#include <string.h>

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

template <typename T>
static bool read_payload(const uint8_t *buf, uint8_t len, T &out)
{
    if (len < sizeof(T))
    {
        return false;
    }
    memcpy(&out, buf, sizeof(T));
    return true;
}

void handle_discovery(PacketHeader header, uint8_t *packet_buffer,
                      uint8_t buffer_size)
{
    // 0 is used as "no UUID yet", so never keep 0 as a real UUID
    while (UUID == 0)
    {
        UUID = generateTrueHardwareSeed();
    }

    return_packet(IdentificationPacket{ UUID, DeviceType::SWITCH });
}

void handle_assignment(PacketHeader header, uint8_t *packet_buffer,
                       uint8_t buffer_size)
{
    AssignmentPacket p;
    if (!read_payload(packet_buffer, buffer_size, p))
    {
        return_packet(StatusPacket{ StatusType::ERROR });
        return;
    }

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
    OrderPacket p;
    if (!read_payload(packet_buffer, buffer_size, p))
    {
        return_packet(StatusPacket{ StatusType::ERROR });
        return;
    }

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
    case OrderType::CHANGE_LIGHT:
        signal0.set_signal_lights(p.OrderValue);
        signal1.set_signal_lights(p.OrderValue);
        signal2.set_signal_lights(p.OrderValue);
        return_packet(StatusPacket{ StatusType::OK });
        return;
    case OrderType::SET_LIGHT_BRIGHTNESS: // not implemented yet
    case OrderType::SET_POWER_LEVEL: // power modules only
    default:
        return_packet(StatusPacket{ StatusType::UNKNOWN_COMMAND_ERROR });
        return;
    }
}

void handle_fetch(PacketHeader header, uint8_t *packet_buffer,
                  uint8_t buffer_size)
{
    FetchPacket p;
    if (!read_payload(packet_buffer, buffer_size, p))
    {
        return_packet(InfoPacket{ InfoType::ERROR, 0 });
        return;
    }

    switch (p.Fetch)
    {
    case FetchType::RAIL_SWITCH_STATUS:
        return_packet(InfoPacket{ motor.get_state(), 0 });
        return;
    case FetchType::POWER_DETECTOR:
    case FetchType::INFARED_DETECTOR:
    default:
        return_packet(InfoPacket{ InfoType::ERROR, 0 });
        return;
    }
}

void handle_board(PacketHeader header, uint8_t *packet_buffer,
                  uint8_t buffer_size)
{
    return_packet(StatusPacket{ StatusType::UNKNOWN_COMMAND_ERROR });
}

void fetch_serial()
{
    static uint8_t buffer[PACKET_BUFFER_SIZE];
    PacketHeader header;

    const uint8_t read = fetch_packet(buffer, PACKET_BUFFER_SIZE, header);
    if (read == UINT8_ERROR)
    {
        return;
    }

    switch (header.type)
    {
    case PacketType::DISCOVERY:
        handle_discovery(header, buffer, read);
        break;
    case PacketType::ASSIGNMENT:
        handle_assignment(header, buffer, read);
        break;
    case PacketType::HEARTBEAT:
        handle_heartbeat(header, buffer, read);
        break;
    case PacketType::ORDER:
        handle_order(header, buffer, read);
        break;
    case PacketType::FETCH:
        handle_fetch(header, buffer, read);
        break;
    case PacketType::BOARD:
        handle_board(header, buffer, read);
        break;
    case PacketType::IDENTIFICATION:
    case PacketType::STATUS:
    case PacketType::INFO:
        // Responses are meant for the controller: never answer them
        break;
    default:
        return_packet(StatusPacket{ StatusType::UNKNOWN_COMMAND_ERROR });
        break;
    }
}
