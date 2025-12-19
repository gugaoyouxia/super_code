#include "Downloader.h"
#include <iostream>

int main() {
    Downloader dl;

    DownloadConfig config;
    config.url = "https://yatai.img.wwoyun.cn/20251219/6acc76ebd0dc9dce853258637d58bf8b.png";
    config.outputPath = Downloader::get_root_dir().append("lsz.png");

    if (!dl.download(config)) {
        std::cerr << "Download failed!" << std::endl;
        return -1;
    }
    return 0;
}