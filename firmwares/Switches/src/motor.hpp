#ifndef _MOTOR_H_
#define _MOTOR_H_

#include <stddef.h>
#include <stdint.h>

#include "Servo.h"
#include "packets.hpp"

#define DEFAULT_MIN 18
#define DEFAULT_MAX 90

#define DEFAULT_SPEED 2

class Motor
{
public:
    Motor(int pin, uint8_t min = DEFAULT_MIN, uint8_t max = DEFAULT_MAX,
          uint8_t speed = DEFAULT_SPEED)
    {
        if (set_bounds(min, max))
        {
            set_bounds(DEFAULT_MIN, DEFAULT_MAX);
        }

        if (set_speed(speed))
        {
            set_speed(DEFAULT_SPEED);
        }

        servo.attach(pin);

        target_status_ = InfoType::PLUS;
        current_status_ = InfoType::PLUS;
        current_position_ = max;

        servo.write(max);
    }

    Motor(const Motor &) = default;
    Motor(Motor &&) = default;
    Motor &operator=(const Motor &) = default;
    Motor &operator=(Motor &&) = default;

    /**
     * @brief Update the motor. Runs every tick
     *
     */

    void Update();

    /**
     *  @brief Order a motor movement.
     *  @param destination_state The wanted new position.,
     *  @return
     *  @retval IDLE = The motor is already in the ordered position.
     *  @retval OK = Starting the movement.
     *  @retval INVALID_ERROR = The motor is already moving.
     *  @retval UNKNOWN_COMMAND_ERROR = Invalid input argument
     */
    StatusType order_movement(InfoType destination_state);

    /**
     *  @brief Get the motor current status
     *  @return
     *  @retval PLUS = The motor is in the plus position
     *  @retval MINUS = The motor is in the minus position
     *  @retval MOVING = The motor is still in movement
     */
    InfoType get_state() const;

    /**
     *  @brief Set the motor start and end of movement values
     *  @param min the minimun degree value
     *  @param max the maximum degree value
     *  @return
     *  @retval 0 = ok
     *  @retval 1 = invalid min or max bound
     */
    int set_bounds(uint8_t min, uint8_t max);

    /**
     *  @brief Set the motor speed in degree per ticks
     *  @param speed the speed in degree per ticks
     *  @return
     *  @retval 0 = ok
     *  @retval 1 = invalid speed
     */
    int set_speed(uint16_t speed);

private:
    InfoType current_status_;
    InfoType target_status_;
    uint8_t lower_bound_;
    uint8_t higher_bound_;
    uint16_t speed_;
    uint16_t current_position_;

    Servo servo;
};

#endif // _MOTOR_H_
