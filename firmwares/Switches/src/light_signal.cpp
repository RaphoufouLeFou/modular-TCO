#include "light_signal.hpp"

#include "Arduino.h"
#include "packets.hpp"

LightSignal::LightSignal(uint8_t pin_red, uint8_t pin_green,
                         uint8_t pin_warning, uint8_t pin_white,
                         uint8_t pin_double_yellow)
{
    pin_red_ = pin_red;
    pin_green_ = pin_green;
    pin_warning_ = pin_warning;
    pin_white_ = pin_white;
    pin_double_yellow_ = pin_double_yellow;
}

void set_pin_level(uint8_t pin, uint8_t level)
{
    if (level)
    {
        pinMode(pin, INPUT_PULLUP);
    }
    else
    {
        digitalWrite(pin, LOW);
        pinMode(pin, OUTPUT);
    }
}

void LightSignal::init()
{
    set_pin_level(pin_red_, 1);
    set_pin_level(pin_green_, 1);
    set_pin_level(pin_warning_, 1);
    set_pin_level(pin_white_, 1);

    if (pin_double_yellow_ > 0)
        set_pin_level(pin_double_yellow_, 1);
}

uint8_t LightSignal::set_signal_lights(uint32_t data)
{
    uint8_t id = (data >> 24) & 0xFF;

    if (id != id_)
    {
        // return 1;
    }

    uint8_t status = (data >> 16) & 0xFF;

    set_pin_level(pin_red_, (status >> 7) & 1);
    set_pin_level(pin_green_, (status >> 6) & 1);
    set_pin_level(pin_warning_, (status >> 5) & 1);
    set_pin_level(pin_white_, (status >> 4) & 1);

    if (pin_double_yellow_ > 0)
        set_pin_level(pin_double_yellow_, (status >> 3) & 1);

    return 0;
}

void LightSignal::set_id(uint8_t id)
{
    id_ = id;
}
