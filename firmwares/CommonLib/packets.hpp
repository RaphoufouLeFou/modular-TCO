// packet formats
//
// Portable across ESP-IDF, AVR (ATmega328P, no STL) and CH32 (RISC-V GCC):
//  - no heap allocation, no STL: everything works on caller-provided buffers
//  - requires only GCC and C++11
//  - all targets are little-endian, so packed structs can be memcpy'd directly
//
// Wire format of one frame:
//   [START 0xAA][PacketHeader (4 bytes)][payload fixed part][payload extra
//   bytes] header.size     = fixed part + extra bytes (max 255) header.checksum
//   = CRC-8 of header + payload, computed with checksum = 0

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
    CHANGE_LIGHT, // request a light change. For this one, the packet value is
                  // first 8 bits, signal ID
                  // next 8 bits, all lights status
                  // final 16 bits : unused
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
    ERROR, // An error has happend in the module.
    CHECKSUM_ERROR, // checksum mismatch, so a resend is requested
    INVALID_ERROR, // Invalid command at this time (eg. ordering to move a
                   // moving swich)
    UNKNOWN_COMMAND_ERROR, // Unknown order or command
};

struct PacketHeader
{
    // PacketType enum as a 1-byte int
    uint8_t type = static_cast<uint8_t>(PacketType::HEARTBEAT);

    // size of the packet data in bytes (fixed part + extra bytes)
    uint8_t size = 0;

    // module ID. Every module get all packet, but they discard them if the ID
    // does not correspond. Only the DiscoveryPacket is exempted of this ID
    uint8_t ID = 0;

    // checksum of the whole packet, calculated while the checksum is 0.
    uint8_t checksum = 0;

} __attribute__((__packed__));

// ---------------------------------------------------------------------------
// Payloads
// Each payload declares its PacketType with a static member. Static members
// take no space in the struct, so the wire layout is unchanged.
// ---------------------------------------------------------------------------

struct DiscoveryPacket
{
    static constexpr PacketType Type = PacketType::DISCOVERY;
    // nothing, just an empty packet

} __attribute__((__packed__));

struct AssignmentPacket
{
    static constexpr PacketType Type = PacketType::ASSIGNMENT;

    // UUID of the module to assign the new ID
    uint16_t UUID;

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
    uint8_t Order;

    // order value or packed values
    uint32_t OrderValue;

} __attribute__((__packed__));

struct FetchPacket
{
    static constexpr PacketType Type = PacketType::FETCH;

    // FetchType enum value
    uint8_t Fetch;

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
    uint16_t UUID;

} __attribute__((__packed__));

struct StatusPacket
{
    static constexpr PacketType Type = PacketType::STATUS;

    // StatusType enum value
    uint8_t Status;

} __attribute__((__packed__));

struct InfoPacket
{
    static constexpr PacketType Type = PacketType::INFO;

    // InfoType enum value
    uint8_t Value;

    // info value or packed values
    uint32_t InfoValue;

} __attribute__((__packed__));

// ---------------------------------------------------------------------------
// Encoding / decoding
// ---------------------------------------------------------------------------

namespace Packet
{

    constexpr uint8_t kStartByte = 0xAA;
    constexpr uint16_t kHeaderSize = sizeof(PacketHeader);
    constexpr uint16_t kMaxPayload = 255;
    // Largest possible frame, start byte included.
    constexpr uint16_t kMaxFrameSize = 1 + kHeaderSize + kMaxPayload;

    // Size of a payload's fixed part on the wire. Empty structs are 1 byte in
    // C++, but carry 0 bytes on the wire. __is_empty is a GCC built-in, so this
    // also works on AVR where <type_traits> is missing.
    template <class P>
    constexpr uint8_t PayloadSize()
    {
        return __is_empty(P) ? 0 : static_cast<uint8_t>(sizeof(P));
    }

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

    // Builds a complete frame (start byte, header, payload, extra bytes,
    // checksum) into `out`. Returns the frame length, or 0 on error (buffer too
    // small, payload too big).
    template <class P>
    uint16_t Encode(uint8_t id, const P &payload, uint8_t *out,
                    uint16_t out_capacity, const uint8_t *extra = nullptr,
                    uint8_t extra_len = 0)
    {
        const uint8_t fixed = PayloadSize<P>();
        const uint16_t body = static_cast<uint16_t>(fixed) + extra_len;
        const uint16_t total = 1 + kHeaderSize + body;

        if (!out || body > kMaxPayload || total > out_capacity)
            return 0;
        if (extra_len && !extra)
            return 0;

        PacketHeader header;
        header.type = static_cast<uint8_t>(P::Type);
        header.size = static_cast<uint8_t>(body);
        header.ID = id;
        header.checksum = 0;

        uint8_t *p = out;
        *p++ = kStartByte;
        memcpy(p, &header, kHeaderSize);
        p += kHeaderSize;
        if (fixed)
        {
            memcpy(p, &payload, fixed);
            p += fixed;
        }
        if (extra_len)
            memcpy(p, extra, extra_len);

        // checksum over header + payload, computed while the checksum field is
        // 0
        out[1 + offsetof(PacketHeader, checksum)] = Crc8(out + 1, total - 1);
        return total;
    }

    // Checks a received frame. `frame` starts at the header (start byte already
    // removed, as PacketParser stores it). Returns true if the length and the
    // checksum are correct.
    inline bool Verify(const uint8_t *frame, uint16_t len)
    {
        if (!frame || len < kHeaderSize)
            return false;

        PacketHeader header;
        memcpy(&header, frame, kHeaderSize);
        if (len != kHeaderSize + header.size)
            return false;

        const uint8_t received = header.checksum;
        header.checksum = 0;
        uint8_t crc =
            Crc8(reinterpret_cast<const uint8_t *>(&header), kHeaderSize);
        crc = Crc8(frame + kHeaderSize, header.size, crc);
        return crc == received;
    }

    // Reads the header of a verified frame.
    inline PacketHeader Header(const uint8_t *frame)
    {
        PacketHeader header;
        memcpy(&header, frame, kHeaderSize);
        return header;
    }

    // Copies the payload of a verified frame into `out`. Fails if the frame is
    // not of type P or is too short. Optionally returns the extra bytes
    // (pointing into `frame`, valid as long as the frame buffer is).
    template <class P>
    bool Extract(const uint8_t *frame, P &out, const uint8_t **extra = nullptr,
                 uint8_t *extra_len = nullptr)
    {
        if (!frame)
            return false;

        const PacketHeader header = Header(frame);
        const uint8_t fixed = PayloadSize<P>();
        if (header.type != static_cast<uint8_t>(P::Type) || header.size < fixed)
            return false;

        if (fixed)
            memcpy(&out, frame + kHeaderSize, fixed);
        if (extra)
            *extra = frame + kHeaderSize + fixed;
        if (extra_len)
            *extra_len = header.size - fixed;
        return true;
    }

} // namespace Packet

// ---------------------------------------------------------------------------
// Byte-by-byte receiver, usable from a UART interrupt or a polling loop.
// Capacity = largest frame (without start byte) this MCU accepts. Frames that
// don't fit are dropped. Use a small value on the ATmega (e.g. 32 or 64), and
// up to Packet::kMaxFrameSize - 1 where BOARD packets must be received.
// ---------------------------------------------------------------------------

enum class ParseResult : uint8_t
{
    NONE = 0, // frame not complete yet
    FRAME_OK, // a complete frame with a valid checksum is ready
    FRAME_BAD, // a complete frame arrived but the checksum is wrong
};

template <uint16_t Capacity>
class PacketParser
{
public:
    // Feed one received byte.
    ParseResult Feed(uint8_t byte)
    {
        if (!in_frame_)
        {
            if (byte == Packet::kStartByte)
            {
                in_frame_ = true;
                len_ = 0;
            }
            return ParseResult::NONE;
        }

        if (len_ >= Capacity)
        {
            Reset();
            return ParseResult::NONE;
        }
        buf_[len_++] = byte;

        if (len_ < Packet::kHeaderSize)
            return ParseResult::NONE;

        const uint16_t expected =
            Packet::kHeaderSize + buf_[offsetof(PacketHeader, size)];
        if (expected > Capacity)
        {
            Reset(); // too big for this MCU, drop it
            return ParseResult::NONE;
        }
        if (len_ < expected)
            return ParseResult::NONE;

        in_frame_ = false;
        return Packet::Verify(buf_, len_) ? ParseResult::FRAME_OK
                                          : ParseResult::FRAME_BAD;
    }

    // Call on inter-byte timeout to drop a partial frame.
    void Reset()
    {
        in_frame_ = false;
        len_ = 0;
    }

    // The last complete frame (header first, no start byte).
    const uint8_t *Frame() const
    {
        return buf_;
    }
    uint16_t Length() const
    {
        return len_;
    }
    PacketHeader Header() const
    {
        return Packet::Header(buf_);
    }

private:
    uint8_t buf_[Capacity];
    uint16_t len_ = 0;
    bool in_frame_ = false;
};
