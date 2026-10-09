#include <Arduino.h>

#include "config.hpp"
#include "light_signal.hpp"
#include "motor.hpp"
#include "packets.hpp"
#include "packets_handler.hpp"

uint8_t id_ = UINT8_ERROR;

int main()
{
    init();

    Serial.begin(9600);

    Serial.println("Hello world!");

    uint32_t last_time = millis();

    get_motor()->init(2);
    get_signal0()->init();
    get_signal1()->init();
    get_signal2()->init();

    pinMode(4, OUTPUT);
    digitalWrite(4, LOW);

    while (1)
    {
        fetch_serial();

        uint32_t current_time = millis();
        if (current_time - last_time >= TICK_DURATION_MS)
        {
            get_motor()->Update();
            last_time = current_time;
        }
    }

    return 0;
}
