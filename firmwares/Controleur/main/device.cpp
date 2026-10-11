#include "device.hpp"

#include "config.h"
#include "packets.hpp"

Device::Device(uint8_t port)
{
    port_ = port;
    init();
}

uint8_t Device::init()
{
    return 0;
}

void Device::heartbeat()
{}

Device *Device::get_by_id(uint8_t port)
{
    if (port >= PORTS_COUNT + TCO_COUNT)
    {
        return nullptr;
    }

    return &devices[port];
}

Device Device::devices[PORTS_COUNT + TCO_COUNT] = { 0 };
