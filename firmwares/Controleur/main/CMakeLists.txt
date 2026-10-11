idf_component_register(SRCS "main.cpp" "lcd.cpp" "server.cpp" "files.cpp" "tile.cpp" "packets_serial.cpp" "device.cpp"
                    INCLUDE_DIRS "." "../../CommonLib/." REQUIRES esp_http_server esp_wifi spiffs
                    )
                    
spiffs_create_partition_image(storage data_folder FLASH_IN_PROJECT)
                    