#pragma once

#include <cstdint>

#include "config.h"
#include "packets.hpp"

class Device
{
public:
    StatusType init();
    StatusType heartbeat();
    StatusType order(OrderType order, uint32_t OrderValue = 0);
    InfoType fetch(uint32_t &out_value, FetchType fetch,
                   uint8_t FetchValue = 0);

    DeviceType get_type();
    static Device *get_by_id(uint8_t port);

    static void init_devices();

private:
    uint8_t port_; // also known as ID or device_id
    DeviceType type_;

    static Device *devices[PORTS_COUNT + TCO_COUNT];

    Device(uint8_t port = UINT8_ERROR);
};
