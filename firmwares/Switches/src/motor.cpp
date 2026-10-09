#include "motor.hpp"

#include "Servo.h"
#include "config.hpp"
#include "packets.hpp"

void Motor::Update()
{
    if (current_status_ == target_status_)
    {
        return;
    }

    if (target_status_ == InfoType::PLUS)
    {
        current_position_ += speed_;
    }
    else
    {
        current_position_ -= speed_;
    }

    if (current_position_ <= lower_bound_)
    {
        current_position_ = lower_bound_;
        current_status_ = target_status_;
    }
    else if (current_position_ >= higher_bound_)
    {
        current_position_ = higher_bound_;
        current_status_ = target_status_;
    }
    else
    {
        current_status_ = InfoType::MOVING;
    }

    servo.write(current_position_);
}

StatusType Motor::order_movement(OrderType destination_state)
{
    if (destination_state != OrderType::MOVE_PLUS
        && destination_state != OrderType::MOVE_MINUS)
    {
        return StatusType::UNKNOWN_COMMAND_ERROR;
    }

    if (current_status_ == InfoType::MOVING)
    {
        return StatusType::INVALID_ERROR;
    }

    InfoType dest = InfoType::PLUS;
    if (destination_state == OrderType::MOVE_MINUS)
    {
        dest = InfoType::MINUS;
    }

    if (dest == current_status_)
    {
        return StatusType::IDLE;
    }

    target_status_ = dest;
    return StatusType::OK;
}

InfoType Motor::get_state() const
{
    return current_status_;
}

int Motor::set_bounds(uint8_t min, uint8_t max)
{
    if (min >= max)
        return 1;

    lower_bound_ = min;
    higher_bound_ = max;

    return 0;
}

StatusType Motor::set_bounds(uint32_t bounds)
{
    uint8_t min, max;
    min = (bounds >> 0) & 0xFF;
    max = (bounds >> 8) & 0xFF;
    int res = set_bounds(min, max);
    if (res)
    {
        return StatusType::INVALID_ERROR;
    }
    return StatusType::OK;
}

StatusType Motor::set_speed(uint32_t speed)
{
    if (speed == 0)
        return StatusType::INVALID_ERROR;

    speed_ = speed;
    return StatusType::OK;
}
