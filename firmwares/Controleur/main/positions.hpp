#pragma once

#include <cstdint>

class Pos
{
public:
    Pos(uint8_t x = 0, uint8_t y = 0);

    Pos operator+(const Pos &rhs) const
    {
        return Pos(x_ + rhs.x_, y_ + rhs.y_);
    }
    Pos &operator+=(const Pos &rhs)
    {
        x_ += rhs.x_;
        y_ += rhs.y_;
        return *this;
    }

    Pos operator-(const Pos &rhs) const
    {
        return Pos(x_ - rhs.x_, y_ - rhs.y_);
    }
    Pos &operator-=(const Pos &rhs)
    {
        x_ -= rhs.x_;
        y_ -= rhs.y_;
        return *this;
    }

    bool operator==(const Pos &rhs) const
    {
        return (x_ == rhs.x_ && y_ == rhs.y_);
    }

private:
    uint8_t x_;
    uint8_t y_;
};
