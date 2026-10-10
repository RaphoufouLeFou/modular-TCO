#include <stdio.h>

#include "config.h"
#include "files.h"
#include "lcd.h"
#include "server.h"

void app_main(void)
{
    printf("%s\n", "Hello world!");
    init_files();
    i2c_master_init();
    start_server();
}
