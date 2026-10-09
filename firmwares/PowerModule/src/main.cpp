#include <Arduino.h>

#include "config.hpp"

int main()
{
    init();

    Serial.begin(9600);

    Serial.println("Hello world!");

    while (1)
    {
        delay(TICK_DURATION_MS);
    }

    return 0;
}
