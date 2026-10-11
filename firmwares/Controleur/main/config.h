#ifndef _CONFIG_H_
#define _CONFIG_H_

#define MAX_BOARD_SIZE 16

#define PACKET_BUFFER_SIZE 64
#define PACKET_TIMEOUT_MS 128

#define I2C_MASTER_NUM I2C_NUM_0
#define I2C_MASTER_FREQ_HZ 100000

#define LCD_ADDR 0x27
#define LCD_COLS 16
#define LCD_ROWS 4

#define I2C_MASTER_SCL_IO 26 // 12
#define I2C_MASTER_SDA_IO 25 // 11

#define PORT_S_TX 23 // 9
#define PORT_S_RX 22 // 10

#define PORT_TCO0_TX 4
#define PORT_TCO0_RX 3

#define PORT_TCO1_TX 7
#define PORT_TCO1_RX 6

#define PORT_S0 15
#define PORT_S1 16
#define PORT_S2 17
#define PORT_S3 18

#define ESP_WIFI_SSID "train"
#define ESP_WIFI_PASS "12345678"
#define ESP_WIFI_CHANNEL 1
#define MAX_STA_CONN 2

#define UINT8_ERROR 255

#define SCRATCH_BUFSIZE 8192

#define FILE_PATH_MAX (ESP_VFS_PATH_MAX + CONFIG_SPIFFS_OBJ_NAME_LEN)

#define PORTS_COUNT 12
#define TCO_COUNT 2
#define IS_TCO(p) (p > PORTS_COUNT)

#endif // _CONFIG_H_
