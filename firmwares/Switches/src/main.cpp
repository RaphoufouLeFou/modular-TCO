#include <Arduino.h>

#include "config.hpp"
#include "light_signal.hpp"
#include "motor.hpp"
#include "packets.hpp"

int main()
{
    init();

    Serial.begin(9600);

    Serial.println("Hello world!");

    Motor motor(2);
    LightSignal signal0(18, 17, 16, 15, 14);
    LightSignal signal1(5, 6, 3, 19);
    LightSignal signal2(10, 8, 9, 7);

    motor.order_movement(InfoType::MINUS);

    while (1)
    {
        motor.Update();
        delay(TICK_DURATION_MS);
    }

    return 0;
}
