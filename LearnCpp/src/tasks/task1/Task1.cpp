#include "Downloader.h"
#include "Task1.h"
#include <iostream>

namespace TaskModule {


void printDownloadInfo(const std::string& url, const std::string& path, long timeOut);

void updateConfig(DownloadConfig& cfg);

int Task1() {
    Downloader dl;

    DownloadConfig config;
    config.url = "https://yatai.img.wwoyun.cn/20251219/6acc76ebd0dc9dce853258637d58bf8b.png";
    config.outputPath = Downloader::get_root_dir().append("lsz.png");


    updateConfig(config);



    if (!dl.download(config)) {
        std::cerr << "Download failed!" << std::endl;
        return -1;
    }
    return 0;
}


void printDownloadInfo(const std::string& url, const std::string& path, long timeOut)
{
    // TODO：打印下载信息


}

void updateConfig(DownloadConfig& cfg) {
    // TODO: 更新下载配置

}


}