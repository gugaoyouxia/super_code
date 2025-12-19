cmake_minimum_required(VERSION 3.16)

# 工程名
project(Supercode)

# C++标准
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 指定源文件目录
file(GLOB_RECURSE SOURCES "${CMAKE_SOURCE_DIR}/src/*.cpp")

# 生成可执行文件
add_executable(Supercode ${SOURCES})


# 找到系统的 libcurl
find_package(CURL REQUIRED)

# 链接 libcurl
target_link_libraries(Supercode PRIVATE CURL::libcurl)

# 设置可执行文件输出到 bin 目录
set_target_properties(Supercode PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/bin
)