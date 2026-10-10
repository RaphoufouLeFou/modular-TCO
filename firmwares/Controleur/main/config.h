#ifndef _CONFIG_H_
#define _CONFIG_H_

#define PACKET_BUFFER_SIZE 64

#define I2C_MASTER_SCL_IO 26 // GPIO PIN for I2C master clock
#define I2C_MASTER_SDA_IO 25 // GPIO PIN for I2C master data
#define I2C_MASTER_NUM I2C_NUM_0 // I2C port number for master dev
#define I2C_MASTER_FREQ_HZ 100000 // I2C master clock frequency

#define LCD_ADDR 0x27 // I2C address of the LCD
#define LCD_COLS 16 // Number of columns in the LCD
#define LCD_ROWS 4 // Number of rows in the LCD

#define PORT_S_TX 23
#define PORT_S_RX 22

#define PORT_TCO0_TX
#define PORT_TCO0_RX

#define PORT_TCO1_TX
#define PORT_TCO1_RX

#define ESP_WIFI_SSID "train"
#define ESP_WIFI_PASS "12345678"
#define ESP_WIFI_CHANNEL 1
#define MAX_STA_CONN 2

#define SCRATCH_BUFSIZE 8192

#define FILE_PATH_MAX (ESP_VFS_PATH_MAX + CONFIG_SPIFFS_OBJ_NAME_LEN)

#endif // _CONFIG_H_
