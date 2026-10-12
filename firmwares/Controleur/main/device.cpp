#include "device.hpp"

#include <cinttypes>
#include <cstring>

#include "config.h"
#include "esp_log.h"
#include "packets.hpp"
#include "packets_serial.hpp"

static const char *TAG = "DEVICE";

template <typename R>
static bool parse_response(const PacketHeader &h, const uint8_t *buf,
                           uint8_t len, uint8_t expected_id, bool check_id,
                           R &out)
{
    if (len == UINT8_ERROR)
    {
        return false;
    }
    if (h.type != R::Type)
    {
        ESP_LOGW(TAG, "Expected packet type %d, got %d", (int)R::Type,
                 (int)h.type);
        return false;
    }
    if (len < sizeof(R))
    {
        ESP_LOGW(TAG, "Packet type %d too short (%d < %u)", (int)h.type, len,
                 (unsigned)sizeof(R));
        return false;
    }
    if (check_id && h.ID != expected_id)
    {
        ESP_LOGW(TAG, "Answer from ID %d, expected %d", h.ID, expected_id);
        return false;
    }

    memcpy(&out, buf, sizeof(R));
    return true;
}

Device::Device(uint8_t port)
{
    port_ = port;
    type_ = DeviceType::NONE;
    init();
}

StatusType Device::init()
{
    ESP_LOGI(TAG, "Initializing device %d", port_);
    type_ = DeviceType::NONE;

    uint8_t buf[PACKET_BUFFER_SIZE];
    PacketHeader h;

    uint8_t n = exchange_packet(DiscoveryPacket{}, port_, buf, sizeof(buf), h);

    IdentificationPacket ident;
    if (!parse_response(h, buf, n, port_, false, ident))
    {
        ESP_LOGW(TAG, "Discovery failed for port %d", port_);
        return StatusType::ERROR;
    }

    AssignmentPacket assign{};
    assign.UUID = ident.UUID;
    assign.NewModuleID = port_;

    n = exchange_packet(assign, port_, buf, sizeof(buf), h);

    StatusPacket status;
    if (!parse_response(h, buf, n, port_, true, status))
    {
        ESP_LOGW(TAG, "Assignment failed for port %d (UUID %08" PRIx32 ")",
                 port_, (uint32_t)ident.UUID);
        return StatusType::ERROR;
    }
    if (status.Status != StatusType::OK)
    {
        ESP_LOGW(TAG, "Assignment refused by port %d (status %d)", port_,
                 (int)status.Status);
        return status.Status;
    }

    type_ = ident.type;
    ESP_LOGI(TAG, "Port %d initialized: UUID %08" PRIx32 ", type %d", port_,
             (uint32_t)ident.UUID, (int)type_);
    return StatusType::OK;
}

StatusType Device::heartbeat()
{
    if (type_ == DeviceType::NONE)
    {
        return init();
    }

    uint8_t buf[PACKET_BUFFER_SIZE];
    PacketHeader h;

    const uint8_t n =
        exchange_packet(HeartBeatPacket{}, port_, buf, sizeof(buf), h);

    StatusPacket status;
    if (!parse_response(h, buf, n, port_, true, status)
        || status.Status != StatusType::OK)
    {
        ESP_LOGW(TAG, "Heartbeat failed for port %d", port_);
        type_ = DeviceType::NONE; // re-init on the next heartbeat
        return StatusType::ERROR;
    }

    return StatusType::OK;
}

StatusType Device::order(OrderType order, uint32_t OrderValue)
{
    if (type_ == DeviceType::NONE)
    {
        ESP_LOGW(TAG, "Order %d for port %d: device not initialized",
                 (int)order, port_);
        return StatusType::ERROR;
    }

    uint8_t buf[PACKET_BUFFER_SIZE];
    PacketHeader h;

    const uint8_t n = exchange_packet(OrderPacket{ order, OrderValue }, port_,
                                      buf, sizeof(buf), h);

    StatusPacket status;
    if (!parse_response(h, buf, n, port_, true, status))
    {
        ESP_LOGW(TAG, "Order %d for port %d: no valid answer", (int)order,
                 port_);
        return StatusType::ERROR;
    }

    if (status.Status != StatusType::OK)
    {
        ESP_LOGW(TAG, "Order %d for port %d failed (status %d)", (int)order,
                 port_, (int)status.Status);
    }
    return status.Status;
}

InfoType Device::fetch(uint32_t &out_value, FetchType fetch, uint8_t FetchValue)
{
    if (type_ == DeviceType::NONE)
    {
        ESP_LOGW(TAG, "Fetch %d for port %d: device not initialized",
                 (int)fetch, port_);
        return InfoType::ERROR;
    }

    uint8_t buf[PACKET_BUFFER_SIZE];
    PacketHeader h;

    const uint8_t n = exchange_packet(FetchPacket{ fetch, FetchValue }, port_,
                                      buf, sizeof(buf), h);

    InfoPacket info;
    if (!parse_response(h, buf, n, port_, true, info))
    {
        ESP_LOGW(TAG, "Fetch %d for port %d: no valid answer", (int)fetch,
                 port_);
        return InfoType::ERROR;
    }

    out_value = info.InfoValue;
    if (info.Value == InfoType::ERROR)
    {
        ESP_LOGW(TAG, "Fetch %d for port %d returned ERROR", (int)fetch, port_);
    }
    return info.Value;
}

DeviceType Device::get_type()
{
    return type_;
}

Device *Device::get_by_id(uint8_t port)
{
    if (port >= PORTS_COUNT + TCO_COUNT)
    {
        return nullptr;
    }

    return devices[port];
}

void Device::init_devices()
{
    for (size_t i = 0; i < PORTS_COUNT + TCO_COUNT; i++)
    {
        devices[i] = new Device(i);
    }
}

Device *Device::devices[PORTS_COUNT + TCO_COUNT];
