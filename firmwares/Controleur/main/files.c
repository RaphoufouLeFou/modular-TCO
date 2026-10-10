#include "files.h"

#include <stdio.h>
#include <string.h>

#include "esp_log.h"
#include "esp_spiffs.h"

static const char *TAG = "FILES";

void init_files(void)
{
    ESP_LOGI(TAG, "Init of SPIFFS...");

    esp_vfs_spiffs_conf_t conf = { .base_path = "/spiffs",
                                   .partition_label = "storage",
                                   .max_files = 5,
                                   .format_if_mount_failed = true };

    esp_err_t ret = esp_vfs_spiffs_register(&conf);

    if (ret != ESP_OK)
    {
        if (ret == ESP_FAIL)
        {
            ESP_LOGE(TAG, "Error mounting file system");
        }
        else if (ret == ESP_ERR_NOT_FOUND)
        {
            ESP_LOGE(TAG, "Cannot find the partition");
        }
        else
        {
            ESP_LOGE(TAG, "Failed to init SPIFFS (%s)", esp_err_to_name(ret));
        }
        return;
    }

    size_t total = 0, used = 0;
    ret = esp_spiffs_info("storage", &total, &used);
    if (ret == ESP_OK)
    {
        ESP_LOGI(TAG, "SPIFFS : free: %zu bytes, used: %zu bytes", total, used);
    }
}

char *get_file(const char *name, int *outsize)
{
    return NULL;
}
