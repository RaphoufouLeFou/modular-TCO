#include <stdio.h>

#include "config.h"
#include "files.hpp"
#include "lcd.hpp"
#include "packets_serial.hpp"
#include "server.hpp"

extern "C" void app_main()
{
    printf("%s\n", "Hello world!");
    init_files();
    init_packet_serial();

    LCD_Screen lcd;
    lcd.init();

    Server server;
    server.start_server();
}
