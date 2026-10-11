#pragma once

#include <cstdint>
#include <memory>

#include "addon.hpp"
#include "button.hpp"
#include "config.h"
#include "positions.hpp"

class Tile
{
public:
    enum class Type
    {
        Blank,
        Line,
        Angle,
        Switch,
    };

    struct Connections
    {
        bool left;
        bool right;
        bool top;
        bool bottom;
    };

    Tile(Pos pos, Type type = Type::Blank);

    AddOn *add_top_left();
    AddOn *add_top_right();
    AddOn *add_bottom_left();
    AddOn *add_bottom_right();

private:
    static uint8_t max_ID;

    uint8_t ID_;
    Type type_;
    Pos pos_;
    Connections connections_;

    std::unique_ptr<AddOn> top_left;
    std::unique_ptr<AddOn> top_right;
    std::unique_ptr<AddOn> bottom_left;
    std::unique_ptr<AddOn> bottom_right;
};
