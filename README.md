# Telegram Media Downloader

<p align="center">
  <img src="https://img.shields.io/github/license/johnhom1024/telegram-media-downloader">
  <img src="https://img.shields.io/badge/language-typescript-blue.svg">
  <img src="https://img.shields.io/badge/platform-cross--platform-lightgrey">
</p>

一个轻量的，基于TypeScript编写的跨平台Telegram机器人，可以下载消息中2GB以内的媒体文件。

## ✨ 特性

- 🚀 支持下载2GB以内的媒体文件
- ⏸️ 支持暂停/恢复下载功能
- 🔄 支持并发下载，可配置并发数
- 📊 实时显示下载速度
- 🔗 支持通过消息链接下载
- 💬 支持回复消息重新下载

## 🛠️ 技术栈

- TypeScript
- [GramJS](https://github.com/gram-js/gramjs) - Telegram客户端库
- Node.js

## 📦 安装

### 环境要求

- Node.js >= 14
- pnpm

### 安装步骤

1. 克隆项目
```bash
git clone https://github.com/johnhom1024/telegram-media-downloader.git
cd telegram-media-downloader
```

2. 安装依赖
```bash
pnpm install
```

## ⚙️ 配置

在项目根目录创建`config.yaml`文件，配置如下：

```yaml
# Telegram API配置
api_hash: "你的api_hash"
api_id: "你的api_id"
bot_token: "你的机器人token"

# 下载配置
save_path: "./downloads"  # 下载文件保存路径
max_parallel_download: 5  # 最大并发下载数

# 代理配置（可选）
# proxy:
#   socks_type: 5
#   ip: "192.168.31.210"
#   port: 7221
```

## 🚀 启动

```bash
pnpm start
```

## 🗺️ 路线图

- [x] 打包成docker镜像
- [x] 显示下载速度
- [x] 接收bot测试命令
- [x] 完善媒体文件的下载名称
- [x] 改造bot为中间件形态
- [x] 日志自动下载到本地
- [x] 改用流的方式下载
- [x] 接入pm2
- [x] 能够直接针对某个媒体文件暂停或者取消下载
- [x] 能够回复某个媒体文件，识别到之后重新下载
- [ ] 启动机器人后发送消息给所有者
- [ ] 设置机器人的指令

## 🤝 贡献

欢迎提交PR和Issue！

## 📄 开源协议

本项目采用 [ISC](LICENSE) 协议。

## 🙏 致谢

- [gramjs](https://github.com/gram-js/gramjs)
- [grammY](https://github.com/grammyjs/grammY)
- [telegram_media_downloader](https://github.com/tangyoha/telegram_media_downloader)