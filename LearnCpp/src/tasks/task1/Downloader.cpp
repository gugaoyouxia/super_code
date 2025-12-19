#include "Downloader.h"
#include <cstdio>
#include <iostream>
#include <stdexcept>
#include <filesystem>

Downloader::Downloader() {
    curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to initialize CURL");
    }
}

Downloader::~Downloader() {
    if (curl) {
        curl_easy_cleanup(curl);
    }
}

bool Downloader::download(const DownloadConfig& config) {
    FILE* fp = fopen(config.outputPath.c_str(), "wb");
    if (!fp) {
        std::cerr << "Failed to open file: " << config.outputPath << std::endl;
        return false;
    }

    curl_easy_setopt(curl, CURLOPT_URL, config.url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, &Downloader::write_data);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, fp);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);

    CURLcode res = curl_easy_perform(curl);
    fclose(fp);

    if (res != CURLE_OK) {
        std::cerr << "Download failed: " << curl_easy_strerror(res) << std::endl;
        return false;
    }

    std::cout << "Download success: " << config.outputPath << std::endl;
    return true;
}

size_t Downloader::write_data(void* ptr, size_t size, size_t nmemb, void* stream) {
    return fwrite(ptr, size, nmemb, (FILE*)stream);
}

std::string Downloader::get_root_dir() {
    return std::filesystem::current_path().string().append("/../bin/");
}