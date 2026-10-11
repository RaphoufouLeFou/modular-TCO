#include "tile.hpp"

uint8_t Tile::max_ID = 0;

Tile::Tile(Pos pos, Type type)
{
    pos_ = pos;
    type_ = type;
}
/*
 // TODO
AddOn *Tile::add_top_left()
{}

AddOn *Tile::add_top_right()
{}

AddOn *Tile::add_bottom_left()
{}

AddOn *Tile::add_bottom_right()
{}
*/
