// packet formats

#pragma once

#include <stddef.h>
#include <stdint.h>
#include <string.h>

enum class PacketType : uint8_t
{
    // Broadacts from the Controller to the modules
    DISCOVERY = 0, // register all connected module
    ASSIGNMENT, // Send the module ID to one module
    HEARTBEAT, // Check for the module status
    ORDER, // Order from the Controller. Must be executed
    FETCH, // Ask for an info
    BOARD, // Send the TCO board

    // Response from a modules to the Controller
    IDENTIFICATION, // Sends the module ramdom UUID for the discovery
    STATUS, // Response with the current module status
    INFO, // Information for the controller
};

enum class OrderType : uint8_t
{
    MOVE_PLUS = 0, // move the rail switch to the straight position
    MOVE_MINUS, // move the rail switch to the deviated position

    SET_MOTOR_BOUNDS, // set the rail switch motor min and max angle
                      // first 16 bits : unused
                      // last 8 bits : max
                      // next 8 bits : min
    SET_MOTOR_SPEED, // set the rail switch motor rotation speed
                     // first 32 bits : speed
    SET_LIGHT_BRIGHTNESS, // (Not implemented yet)
                          // i will need to swap the sinal transitor to MMUN2214
                          // to tweak the brighness.
                          // set the rail switch motor rotation speed
                          // first 32 bits : brightness (0-255)
    CHANGE_LIGHT, // request a light change. For this one, the packet value
                  // is first 8 bits, signal ID next 8 bits, all lights
                  // status final 16 bits : unused
    SET_POWER_LEVEL, // Set the power value of a power module
                     // first 16 bits : unused
                     // last 16 bits : power value
};

enum class FetchType : uint8_t
{
    RAIL_SWITCH_STATUS = 0, // Fetch the current rail switch mode. Expect these
                            // returns values :
                            // PLUS - 0
                            // MINUS - 1
                            // MOVING - 2
                            // Value is unused

    POWER_DETECTOR, // Fetch the power module current sensing train detection
                    // Value is unused
    INFARED_DETECTOR, // Fetch the power module infared train detection.
                      // Value is the infared detector ID.
};

enum class InfoType : uint8_t
{
    PLUS = 0, // Rail switch is in the straight position
    MINUS, // Rail switch is in the deviated position
    MOVING, // Rail switch is moving
    HAVE_TRAIN, // The detector is detecting a train
    NO_TRAIN, // The detector is not detecting a train
};

enum class StatusType : uint8_t
{
    IDLE = 0, // Everything is fine, the module is idleing
    OK, // The task or message was reiceved well
    ERROR, // An error has happend in the module. Fatal
    CHECKSUM_ERROR, // checksum mismatch, so a resend is requested
    INVALID_ERROR, // Invalid command at this time (eg. ordering to move a
                   // moving swich)
    UNKNOWN_COMMAND_ERROR, // Unknown order or command
};

struct PacketHeader
{
    // PacketType enum as a 1-byte int
    PacketType type = PacketType::HEARTBEAT;

    // size of the packet data in bytes (fixed part + extra bytes)
    uint8_t size = 0;

    // module ID. Every module get all packet, but they discard them if the ID
    // does not correspond. Only the DiscoveryPacket is exempted of this ID
    uint8_t ID = 0;

    // checksum of the whole packet, calculated while the checksum is 0.
    uint8_t checksum = 0;

} __attribute__((__packed__));

struct DiscoveryPacket
{
    static constexpr PacketType Type = PacketType::DISCOVERY;
    // nothing, just an empty packet

} __attribute__((__packed__));

struct AssignmentPacket
{
    static constexpr PacketType Type = PacketType::ASSIGNMENT;

    // UUID of the module to assign the new ID
    uint32_t UUID;

    // module ID used to send packet to the right module
    uint8_t NewModuleID = 0;

} __attribute__((__packed__));

struct HeartBeatPacket
{
    static constexpr PacketType Type = PacketType::HEARTBEAT;
    // nothing, just an empty packet

} __attribute__((__packed__));

struct OrderPacket
{
    static constexpr PacketType Type = PacketType::ORDER;

    // OrderType enum value
    OrderType Order;

    // order value or packed values
    uint32_t OrderValue;

} __attribute__((__packed__));

struct FetchPacket
{
    static constexpr PacketType Type = PacketType::FETCH;

    // FetchType enum value
    FetchType Fetch;

    // Fetch transmited value
    uint8_t Value;

} __attribute__((__packed__));

struct BoardPacket
{
    static constexpr PacketType Type = PacketType::BOARD;
    // No fixed part. The compressed board bytes travel as the packet's
    // "extra" bytes: pass them to Packet::Encode(), and get them back from
    // Packet::Extract().

} __attribute__((__packed__));

struct IdentificationPacket
{
    static constexpr PacketType Type = PacketType::IDENTIFICATION;

    // uuid generated by to module to temporaly ID itself
    uint32_t UUID;

} __attribute__((__packed__));

struct StatusPacket
{
    static constexpr PacketType Type = PacketType::STATUS;

    // StatusType enum value
    StatusType Status;

} __attribute__((__packed__));

struct InfoPacket
{
    static constexpr PacketType Type = PacketType::INFO;

    // InfoType enum value
    InfoType Value;

    // info value or packed values
    uint32_t InfoValue;

} __attribute__((__packed__));

namespace Packet
{
    // CRC-8 (polynomial 0x07). Detects all 1- and 2-bit errors, all odd numbers
    // of bit errors, and every burst up to 8 bits long
    inline uint8_t Crc8(const uint8_t *data, uint16_t len, uint8_t crc = 0)
    {
        while (len--)
        {
            crc ^= *data++;
            for (uint8_t i = 0; i < 8; ++i)
                crc = (crc & 0x80) ? static_cast<uint8_t>((crc << 1) ^ 0x07)
                                   : static_cast<uint8_t>(crc << 1);
        }
        return crc;
    }

} // namespace Packet
