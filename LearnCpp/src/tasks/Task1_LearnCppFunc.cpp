#include <curl/curl.h>
#include <cstdio>

size_t write_data(void* ptr, size_t size, size_t nmemb, void* stream) {
    return fwrite(ptr, size, nmemb, (FILE*)stream);
}

int main() {
    const char* url =
        "https://yatai.img.wwoyun.cn/20251219/6acc76ebd0dc9dce853258637d58bf8b.png";

    CURL* curl = curl_easy_init();
    if (!curl) {
        return -1;
    }

    FILE* fp = fopen("./lszAvatar.png", "wb");
    if (!fp) {
        curl_easy_cleanup(curl);
        return -1;
    }

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_data);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, fp);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L); // 跟随重定向
    curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);

    CURLcode res = curl_easy_perform(curl);

    fclose(fp);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        printf("download failed: %s\n", curl_easy_strerror(res));
        return -1;
    }

    printf("download success: ./lszAvatar.png\n");
    return 0;
}