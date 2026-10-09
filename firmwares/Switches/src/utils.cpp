#include "utils.hpp"

#include "Arduino.h"

uint32_t generateTrueHardwareSeed()
{
    uint32_t seed = 0;

    analogReference(INTERNAL);
    delay(5);

    for (int i = 0; i < 64; i++)
    {
        int noiseSample = analogRead(A6);

        uint8_t randomBit = noiseSample & 1;

        seed = (seed << 1) | randomBit;

        delayMicroseconds(50);
    }

    analogReference(DEFAULT);
    return seed;
}
