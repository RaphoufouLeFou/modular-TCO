#include <stdio.h>

#include "config.h"
#include "device.hpp"
#include "files.hpp"
#include "lcd.hpp"
#include "packets.hpp"
#include "packets_serial.hpp"
#include "server.hpp"

extern "C" void app_main()
{
    printf("%s\n", "Hello world!");
    init_files();
    init_packet_serial();

    LCD_Screen lcd;
    lcd.init();

    Device::init_devices();

    Device::get_by_id(0)->order(OrderType::MOVE_MINUS, 0);

    Server server;
    server.start_server();
}
