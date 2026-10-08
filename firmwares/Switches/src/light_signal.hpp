#ifndef _LightSignal_H_
#define _LightSignal_H_

#include <stddef.h>
#include <stdint.h>

#include "packets.hpp"

class LightSignal
{
public:
    LightSignal(uint8_t pin_red, uint8_t pin_green, uint8_t pin_warning,
                uint8_t pin_white, uint8_t pin_double_yellow = -1);

    LightSignal(const LightSignal &) = default;
    LightSignal(LightSignal &&) = default;
    LightSignal &operator=(const LightSignal &) = default;
    LightSignal &operator=(LightSignal &&) = default;

    uint8_t set_signal_lights(uint32_t data);
    void set_id(uint8_t id);

private:
    uint8_t pin_red_;
    uint8_t pin_green_;
    uint8_t pin_warning_;
    uint8_t pin_white_;
    uint8_t pin_double_yellow_;

    uint8_t id_ = 255;
};

#endif // _LightSignal_H_
