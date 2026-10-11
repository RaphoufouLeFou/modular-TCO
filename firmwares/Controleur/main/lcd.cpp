#include "lcd.hpp"

#include "config.h"
#include "driver/i2c.h"
#include "esp_log.h"
#include "esp_system.h"
#include "i2c_lcd_pcf8574.h"

i2c_lcd_pcf8574_handle_t lcd;

static const char *TAG = "LCD";

void LCD_Screen::init()
{
    ESP_LOGI(TAG, "Initializing I2C");
    i2c_config_t conf = {};
    conf.mode = I2C_MODE_MASTER;
    conf.sda_io_num = I2C_MASTER_SDA_IO;
    conf.scl_io_num = I2C_MASTER_SCL_IO;
    conf.sda_pullup_en = GPIO_PULLUP_ENABLE;
    conf.scl_pullup_en = GPIO_PULLUP_ENABLE;
    conf.master.clk_speed = I2C_MASTER_FREQ_HZ;
    ESP_ERROR_CHECK(i2c_param_config(I2C_MASTER_NUM, &conf));
    ESP_ERROR_CHECK(i2c_driver_install(I2C_MASTER_NUM, conf.mode, 0, 0, 0));

    lcd_init(&lcd, LCD_ADDR, I2C_MASTER_NUM);
    lcd_begin(&lcd, LCD_COLS, LCD_ROWS);
    lcd_set_backlight(&lcd, 255);
    lcd_set_cursor(&lcd, 0, 0);
    lcd_print(&lcd, "Hello, ESP32!");
}
