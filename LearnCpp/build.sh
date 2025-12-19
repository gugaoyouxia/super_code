#!/bin/bash
# 一键编译 C++ 工程，生成可执行文件到 bin 目录

rm -rf build/*

ROOT_DIR=$(dirname "$0")
BUILD_DIR="$ROOT_DIR/build"
BIN_DIR="$ROOT_DIR/bin"

# 创建目录
mkdir -p "$BUILD_DIR"
mkdir -p "$BIN_DIR"

cd "$BUILD_DIR"

# 生成 Makefile
cmake "$ROOT_DIR"

# 编译
cmake --build . 

echo -e "====code start running====\n\n"

# 直接执行可执行文件
"$BIN_DIR/Supercode"