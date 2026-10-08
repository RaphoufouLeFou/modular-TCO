#include "light_signal.hpp"

#include "Arduino.h"
#include "packets.hpp"

LightSignal::LightSignal(uint8_t pin_red, uint8_t pin_green,
                         uint8_t pin_warning, uint8_t pin_white,
                         uint8_t pin_double_yellow)
{}

uint8_t LightSignal::set_signal_lights(uint32_t data)
{
    uint8_t id = (data >> 24) & 0xFF;

    if (id != id_)
    {
        return 1;
    }

    uint8_t status = (data >> 16) & 0xFF;

    digitalWrite(pin_red_, (status >> 7) & 1);
    digitalWrite(pin_green_, (status >> 6) & 1);
    digitalWrite(pin_warning_, (status >> 5) & 1);
    digitalWrite(pin_white_, (status >> 4) & 1);

    if (pin_double_yellow_ > 0)
        digitalWrite(pin_double_yellow_, (status >> 3) & 1);

    return 0;
}

void LightSignal::set_id(uint8_t id)
{
    id_ = id;
}
