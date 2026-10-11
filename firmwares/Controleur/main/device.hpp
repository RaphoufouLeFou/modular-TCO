#pragma once

#include <cstdint>

#include "config.h"
#include "packets.hpp"

class Device
{
public:
    Device(uint8_t port = UINT8_ERROR);

    uint8_t init();
    void heartbeat();

    static Device *get_by_id(uint8_t port);

private:
    uint8_t port_; // also known as ID or device_id
    DeviceType type_;

    static Device devices[PORTS_COUNT + TCO_COUNT];
};
