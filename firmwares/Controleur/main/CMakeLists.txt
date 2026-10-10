idf_component_register(SRCS "main.c" "lcd.c" "server.c" "files.c"
                    INCLUDE_DIRS "." REQUIRES esp_http_server esp_wifi spiffs
                    )
                    
spiffs_create_partition_image(storage data_folder FLASH_IN_PROJECT)
                    