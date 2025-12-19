#ifndef DOWNLOADER_H
#define DOWNLOADER_H

#include <string>
#include <curl/curl.h>

struct DownloadConfig {
    std::string url;         // 下载链接
    std::string outputPath;  // 保存路径
};

class Downloader {
public:
    Downloader();
    ~Downloader();

    // 使用配置下载
    bool download(const DownloadConfig& config);

    static std::string get_root_dir();

private:
    CURL* curl;

    // 静态写入回调
    static size_t write_data(void* ptr, size_t size, size_t nmemb, void* stream);
};

#endif // DOWNLOADER_H