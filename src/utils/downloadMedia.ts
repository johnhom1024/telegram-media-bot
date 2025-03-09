import { Api, TelegramClient } from "telegram";
import path from "path";
import fs from "fs-extra";
import config from "../config";
import { getExtension } from "telegram/Utils";
import { get } from "lodash";
import { WriteStream } from "fs";
import bigInt from "big-integer";
import EventEmitter from "events";
import logger from "./logger";
import { DownloadController } from "./downloadController";

interface ProgressCallback {
  (downloaded: bigInt.BigInteger, fullSize: bigInt.BigInteger): void;
}

interface DownloadmediaParam {
  client: TelegramClient;
  // 下载控制器
  downloadController?: DownloadController;
  progressCallback?: ProgressCallback;
  // 如果被暂停下载，则执行pauseCallback方法
  pauseCallback?: () => void;
}

const RequestSize = 64 * 1024;

const TempFilePath = path.join(process.cwd(), "temp");

class MediaUtil {
  // 保存消息id和对应的EventEmitter
  private msgEventMap = new Map<number, EventEmitter>();

  constructor() {
    this.checkExistPath();
  }

  get savePath(): string {
    return config.getConfig("save_path") as string;
  }

  get tempPath(): string {
    return TempFilePath;
  }

  private checkExistPath() {
    if (!fs.existsSync(this.savePath)) {
      fs.mkdirSync(this.savePath, { recursive: true });
    }

    if (!fs.existsSync(this.tempPath)) {
      fs.mkdirSync(this.tempPath, { recursive: true });
    }
  }

  public downloadFromBuffer(buffer: Buffer, message: Api.Message) {
    let media: Api.TypeMessageMedia | undefined = undefined;
    if (message instanceof Api.Message) {
      media = message.media;
    }

    const extension = getExtension(media);
    let fileName = this.getFileName(media);
    // 这里fileName可能会有文件的后缀名了，需要去掉
    if (fileName.includes(".")) {
      const lastPointIndex = fileName.lastIndexOf(".");
      fileName = fileName.substring(0, lastPointIndex);
    }

    if (!fileName) {
      fileName = message.text;
    }
    if (!fileName) {
      fileName = message.date.toString();
    }

    let saveFileName = fileName;
    const filePathPrefix = config.getConfig("file_path_prefix") as string[];
    if (filePathPrefix.includes("message_id")) {
      saveFileName = `${message.id} - ${fileName}`;
    }

    fs.outputFileSync(`${this.tempPath}/${saveFileName}.${extension}`, buffer);
  }

  // 获取文件名
  private getFileName(media: any): string {
    const attributes = get(media, "document.attributes", []);
    for (const attribute of attributes) {
      if (attribute instanceof Api.DocumentAttributeFilename) {
        return attribute.fileName;
      }
    }

    return "";
  }

  public getMediaInfo(message: Api.Message | Api.TypeMessageMedia) {
    let media: Api.TypeMessageMedia | undefined = undefined;
    let fileSize = bigInt.zero;
    let messageId = -1;
    if (message instanceof Api.Message) {
      messageId = message.id;
    }
    if (message instanceof Api.Message) {
      media = message.media;
    }
    if (
      media instanceof Api.MessageMediaDocument ||
      media instanceof Api.Document
    ) {
      const doc = media.document;
      if (doc instanceof Api.Document) {
        fileSize = doc.size;
      }
    }

    const extension = getExtension(media);
    let fileName = this.getFileName(media);
    // 这里fileName可能会有文件的后缀名了，需要去掉
    if (fileName.includes(".")) {
      const lastPointIndex = fileName.lastIndexOf(".");
      fileName = fileName.substring(0, lastPointIndex);
    }

    if (!fileName && message instanceof Api.Message) {
      fileName = message.text;
    }
    if (!fileName && message instanceof Api.Message) {
      fileName = message.date.toString();
    }

    // text中可能会有换行符，需要去掉所有换行符
    // text中可能会有/这个斜杠，需要替换成_
    fileName = fileName.replace(/\n/g, "").replace(/\//g, "_");
    // fileName可能过于长，请截取前50个字符
    fileName = fileName.substring(0, 70);
    fileName = `${fileName}.${extension}`;
    let saveFileName = fileName;
    const filePathPrefix = config.getConfig("file_path_prefix") as string[];
    if (filePathPrefix.includes("message_id") && messageId >= 0) {
      saveFileName = `${messageId} - ${fileName}`;
    }

    return {
      fileSize,
      fileName: saveFileName,
    };
  }

  public async downloadMedia(
    message: Api.Message,
    {
      client,
      progressCallback,
      pauseCallback,
      downloadController,
    }: DownloadmediaParam
  ) {
    const { fileSize, fileName } = this.getMediaInfo(message);
    logger.info(`获取到对应的文件名：${fileName}`);

    const tempFilePath = `${this.tempPath}/${fileName}`;
    let initialOffset = bigInt.zero;

    // 检查临时文件是否存在，如果存在则获取已下载的大小作为偏移量
    if (fs.existsSync(tempFilePath)) {
      const stats = fs.statSync(tempFilePath);
      initialOffset = bigInt(stats.size);
      logger.info(`发现已下载的临时文件，从位置 ${initialOffset} 继续下载`);
    }

    const writer = fs.createWriteStream(tempFilePath, {
      flags: initialOffset.equals(0) ? "w" : "a",
    });
    let downloaded = initialOffset;
    let media: Api.TypeMessageMedia | undefined = undefined;

    if (message instanceof Api.Message) {
      media = message.media;
    }

    try {
      for await (const chunk of client.iterDownload({
        file: media,
        requestSize: RequestSize,
        offset: initialOffset,
      })) {
        if (downloadController?.isPaused) {
          // 执行暂停回调
          pauseCallback?.();
          logger.info(`暂停下载：${message.id}`);
          await downloadController.resumePromise;
        }

        if (downloadController?.isCancel) {
          logger.info(`取消下载：${message.id}`);
          return;
        }

        await writer.write(chunk);
        downloaded = downloaded.add(chunk.length);
        if (progressCallback) {
          await progressCallback(downloaded, bigInt(fileSize || bigInt.zero));
        }
      }
      // 将下载好的临时文件移动到指定目录
      const finalFilePath = `${this.savePath}/${fileName}`;
      // 判断指定目录是否已有该文件，如果有则在文件名后面加上一个随机数
      if (fs.existsSync(finalFilePath)) {
        const randomNumber = Math.floor(Math.random() * 1000);
        const newFileName = `${path.basename(
          fileName,
          path.extname(fileName)
        )}_${randomNumber}${path.extname(fileName)}`;
        const newFilePath = `${this.savePath}/${newFileName}`;
        logger.info('当前目录已存在同名文件，已将文件重命名为：' + newFileName + '，请手动检查');
        fs.moveSync(tempFilePath, newFilePath);
        return;
      }
      fs.moveSync(tempFilePath, finalFilePath);
    } finally {
      this.closeWriter(writer);
      this.msgEventMap.delete(message.id);
    }
  }

  public closeWriter(writer: WriteStream) {
    if ("close" in writer) {
      writer.close();
    }
  }
}

export default new MediaUtil();
