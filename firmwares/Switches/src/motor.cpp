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

StatusType Motor::order_movement(InfoType destination_state)
{
    if (destination_state != InfoType::PLUS
        && destination_state != InfoType::MINUS)
    {
        return StatusType::UNKNOWN_COMMAND_ERROR;
    }

    if (current_status_ == InfoType::MOVING)
    {
        return StatusType::INVALID_ERROR;
    }

    if (destination_state == current_status_)
    {
        return StatusType::IDLE;
    }

    target_status_ = destination_state;
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

int Motor::set_speed(uint16_t speed)
{
    if (speed == 0)
        return 1;

    speed_ = speed;
    return 0;
}
