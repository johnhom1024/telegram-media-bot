import { formatBigIntToMB, textToHash } from "../utils";
import { MiddlewareFn, MiddlewareObj } from "../utils/composer";
import { downloadStat } from "../utils/speed";
import { Api, errors, TelegramClient } from "telegram";
import { NewMessageEvent } from "telegram/events";
import mediaUtil from "../utils/downloadMedia";
import { DownloadMessage } from "../utils/downloadMessage";
import { QueueLimit } from "../utils/queue";
import { CallbackQueryEvent } from "telegram/events/CallbackQuery";
import { Button } from "telegram/tl/custom/button";
import logger from "../utils/logger";
import { throttleAsync } from "../utils/utils";
import { DownloadController } from "../utils/downloadController";

interface Props {
  client: TelegramClient;
  sendTo: Api.User;
}

export class MediaDownloadMiddleware implements MiddlewareObj {
  client: TelegramClient;
  // 发送消息的时间间隔 单位ms
  private sendDuration = 2500;
  // 如果消息发送太频繁，可能会报错，这里加一个变量判断是否能发送
  private canEditMessage = true;
  queueLimit: QueueLimit;
  public sendToUser: Api.User;
  private messageIdToDownloadController: Map<number, DownloadController> = new Map();

  constructor({ client, sendTo }: Props) {
    this.client = client;
    this.sendToUser = sendTo;
    this.queueLimit = new QueueLimit(global.appConfig.max_parallel_download);

    // 监听某个任务可继续下载了，就执行downloadController恢复下载的方法。
    this.queueLimit.continueCallback((messageId) => {
      const downloadController = this.messageIdToDownloadController.get(Number(messageId));
      // 恢复下载
      downloadController?.resumeDownload();
    });
  }

  // 当前正在下载的任务id
  get currentEditMsgId(): number | undefined {
    if (this.queueLimit.runningQueue.length > 0) {
      const task = this.queueLimit.runningQueue[0]
      return Number(task.key);
    }

    return undefined;
  }



  middleware<T extends NewMessageEvent>(): MiddlewareFn<T> {
    return async (ctx, next) => {
      const message = ctx.message;

      logger.info(`准备下载消息中的媒体文件：${message.id}`);
      const replyMessage = await this.client
        .sendMessage(this.sendToUser.id, {
          message: "等待中...",
          replyTo: message.id,
        })
        .catch((err) => {});

      if (!replyMessage) {
        return;
      }

      // 这里判断一下队列中是否有存在重复的任务
      if (this.queueLimit.hasTask(message.id.toString())) {
        await this.client.editMessage(this.sendToUser.id, {
          message: replyMessage.id,
          text: "已有该任务在队列中，无需重复下载",
        });
        return;
      }

      const pausePattern = {
        type: "pause",
        messageId: message.id,
      };
      const pauseButton = Button.inline(
        "暂停",
        Buffer.from(JSON.stringify(pausePattern))
      );

      const editMessageThrottled = throttleAsync(
        this.client.editMessage.bind(this.client),
        { delay: this.sendDuration }
      );

      this.queueLimit.add(message.id.toString(), async () => {
        const downloadMsg = new DownloadMessage({
          messageId: message.id,
          total: 0,
        });

        const downloadController = new DownloadController();
        this.messageIdToDownloadController.set(message.id, downloadController);
        // 获取文件总大小
        const { fileSize } = mediaUtil.getMediaInfo(message);

        downloadMsg.update({
          total: formatBigIntToMB(fileSize),
        });

        await editMessageThrottled(this.sendToUser.id, {
          message: replyMessage.id,
          text: this.formatMessage(downloadMsg.getMessageWithoutProgress()),
          parseMode: "html",
          buttons: [pauseButton],
        });

        let lastMessageHashes: string[] = [];
        let lastMessage = "";

        await mediaUtil.downloadMedia(message, {
          client: this.client,
          downloadController,
          progressCallback: async (download, total) => {
            const downloaded = formatBigIntToMB(download);
            const totalInMB = formatBigIntToMB(total);
            downloadMsg.update({ downloaded, total: totalInMB });
            downloadMsg.setPause(false);

            if (!this.canEditMessage) {
              return;
            }

            if (
              this.currentEditMsgId !== message.id
            ) {
              return;
            }

            downloadStat.updateDownloadResult({
              messageId: message.id,
              downloaded: Number(download),
            });

            const speed = downloadStat.getSpeed(message.id);

            downloadMsg.update({
              downloaded: downloaded,
              total: totalInMB,
              speed,
            });

            const downloadMessage = downloadMsg.getMessage();

            const downloadHash = textToHash(downloadMessage);

            // 检查新的hash是否已存在于数组中
            if (!lastMessageHashes.includes(downloadHash)) {
              try {
                const result = await editMessageThrottled(this.sendToUser.id, {
                  message: replyMessage.id,
                  text: this.formatMessage(downloadMessage),
                  parseMode: "html",
                  buttons: [pauseButton],
                });
                // 如果result返回undefined，说明当前的函数被截流给截掉了，所以不记录当前信息
                if (!result) {
                  return;
                }
                lastMessage = downloadMessage;
                // 将新的hash添加到数组开头
                lastMessageHashes.unshift(downloadHash);
                // 保持数组长度为3
                if (lastMessageHashes.length > 3) {
                  lastMessageHashes.pop();
                }
              } catch (error) {
                logger.error(error);
                if (error instanceof errors.FloodWaitError) {
                  this.canEditMessage = false;
                  setTimeout(() => {
                    this.canEditMessage = true;
                  }, error.seconds * 1000);
                } else {
                  // 输出上一个消息
                  logger.error("lastMessage: \n", { lastMessage });
                  // 输出当前信息
                  logger.error("currentMessage: \n", {
                    currentMessage: downloadMessage,
                  });
                }
              }
            }
          },
          pauseCallback: async () => {
            const downloadMessage = downloadMsg.setPause(true);

            const continuePattern = {
              type: "continue",
              messageId: message.id,
            };

            const continueButton = Button.inline(
              "继续",
              Buffer.from(JSON.stringify(continuePattern))
            );
            await this.client.editMessage(this.sendToUser.id, {
              message: replyMessage.id,
              text: this.formatMessage(downloadMessage),
              parseMode: "html",
              buttons: [continueButton],
            });
          },
        });

        // 下载完成之后
        // 修改lastMessage
        const finishedMessage = downloadMsg.finish();
        downloadStat.remove(message.id);

        if (this.canEditMessage) {
          this.client.editMessage(this.sendToUser.id, {
            message: replyMessage.id,
            text: this.formatMessage(finishedMessage),
            parseMode: "html",
          });
        }

        logger.info(`下载完成: ${message.id}`);
      });
    };
  }

  private formatMessage(message: string) {
    return `<code>${message}</code>`;
  }

  // 用户点击了按钮之后，会触发这里的回调中间件
  callbackMiddleware<T extends CallbackQueryEvent>(): MiddlewareFn<T> {
    return (ctx, next) => {
      const data = ctx.data;
      // 将data转成string，这里data是Buffer
      const dataStr = data?.toString();
      if (dataStr) {
        const pattern = JSON.parse(dataStr) as {
          type: string;
          messageId: number;
        };
        const { type } = pattern;
        switch (type) {
          case "pause":
            {
              const { messageId } = pattern;
              if (messageId) {
                // 暂停任务
                const controll = this.messageIdToDownloadController.get(messageId);
                if (controll) {
                  controll.pauseDownload();
                  this.queueLimit.pauseTask(String(messageId));
                }
                ctx.answer();
                return;
              }
            }
            break;
          case "continue":
            {
              const { messageId } = pattern;
              if (messageId) {
                this.queueLimit.continueTask(String(messageId));
                ctx.answer();
                return;
              }
            }
            break;
        }
      }

      next();
    };
  }


}
