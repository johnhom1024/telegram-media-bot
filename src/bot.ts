import {
  readBotSession,
  readUserSession,
  saveBotSession,
  saveUserSession,
} from "./utils";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import readline, { ReadLine } from "readline";
import "./config";
import { ProxyInterface } from "telegram/network/connection/TCPMTProxy";
import { Button } from "telegram/tl/custom/button";
import { Composer, run } from "./utils/composer";
import { NewMessage, NewMessageEvent } from "telegram/events";
import {
  CallbackQuery,
  CallbackQueryEvent,
} from "telegram/events/CallbackQuery";
import { MediaDownloadMiddleware } from "./middleware/mediaMiddleware";
import logger from "./utils/logger";
import tgLogger from "./utils/overrideTGLogger";

export class BotMediaDownloader {
  // 机器人客户端
  public botClient: TelegramClient;
  // 用户客户端
  public userClient: TelegramClient;

  public rl: ReadLine;
  public me: Api.User | undefined;

  // 机器人session
  private botSession: StringSession;
  // 用户的session
  private userSession: StringSession;

  private composer: Composer;
  // 点击消息按钮的回调处理器
  private callbackComposer: Composer<CallbackQueryEvent>;

  private newMsgComposer: Composer;

  constructor() {
    const botLocalSession = readBotSession();
    const userLocalSession = readUserSession();
    this.botSession = new StringSession(botLocalSession);
    this.userSession = new StringSession(userLocalSession);
    this.composer = new Composer<NewMessageEvent>();
    this.newMsgComposer = new Composer();

    this.callbackComposer = new Composer<CallbackQueryEvent>();

    const apiId = global.appConfig.api_id;
    const apiHash = global.appConfig.api_hash;

    let proxy: ProxyInterface | undefined = undefined;

    if (global.appConfig.proxy) {
      proxy = {
        ip: global.appConfig.proxy.ip,
        port: global.appConfig.proxy.port,
        socksType: global.appConfig.proxy.socks_type,
      };
    }

    this.botClient = new TelegramClient(this.botSession, apiId, apiHash, {
      retryDelay: 5 * 1000, // 等待5s之后再重试
      proxy,
      baseLogger: tgLogger,
    });

    this.userClient = new TelegramClient(this.userSession, apiId, apiHash, {
      retryDelay: 5 * 1000, // 等待5s之后再重试
      proxy,
      baseLogger: tgLogger,
    });

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  public async startup() {
    await this.userLogin();
    // 登录
    await this.login();
    logger.info("You should now be connected");
    // 设置中间件
    this.handleMiddleware();
    // 发送消息
    this.sendHelpMsg();
    // 开始监听消息
    this.startListening();
  }

  public sendHelpMsg() {
    this.botClient
      .sendMessage(this.me!.id, {
        message: "你好",
      })
      .catch((err) => {});
  }

  public async login() {
    const botToken = global.appConfig.bot_token;
    await this.botClient.start({
      botAuthToken: botToken,
    });
    const newSession = this.botClient.session.save();
    saveBotSession(newSession);
  }

  public async userLogin() {
    await this.userClient.start({
      phoneNumber: async () =>
        new Promise((resolve) => {
          this.rl.question("please enter your phone number:\n", resolve);
        }),
      password: async () =>
        new Promise((resolve) => {
          this.rl.question("please enter your password:\n", resolve);
        }),
      phoneCode: async () =>
        new Promise((resolve) => {
          this.rl.question("please enter the code you received:\n", resolve);
        }),
      onError: (err) => void logger.error(err),
    });

    const newSession = this.userClient.session.save();
    saveUserSession(newSession);

    this.me = await this.userClient.getMe();
  }

  handleMiddleware() {
    const mediaMiddleware = new MediaDownloadMiddleware({
      client: this.botClient,
      sendTo: this.me!,
    });
    // 如果识别是媒体文件才进入后续的中间件
    this.composer.filter((ctx) => {
      const message = ctx.message;
      if (message.media) {
        return true;
      }
      return false;
    }, mediaMiddleware.middleware());

    this.newMsgComposer.use(async (ctx: NewMessageEvent, next) => {
      const message = ctx.message;
      const chatId = message.chatId;
      const replyToMsgId = message.replyTo?.replyToMsgId;
      if (replyToMsgId) {
        const result = await this.botClient.getMessages(chatId, {
          ids: [replyToMsgId],
        });
        const msg = result.pop();
        if (msg) {
          run(this.composer.middleware(), { message: msg });
          return;
        }
      }
      next();
    });

    this.newMsgComposer.use(async (ctx: NewMessageEvent, next) => {
      const message = ctx.message;
      const text = message.text;

      if (text.startsWith("https://t.me")) {
        // 拆分
        const arr = text.split("/");
        const mediaMessageId = arr.pop();
        const chatId = arr.pop();

        if (mediaMessageId) {
          const result = await this.botClient.getMessages(chatId, {
            ids: [Number(mediaMessageId)],
          });
          const msgInstance = result.pop();

          if (msgInstance?.media instanceof Api.MessageMediaDocument) {
            logger.info(`识别到消息中的媒体文件：${mediaMessageId}`);
            // 这里修改id为当前消息的id，方便后面直接引用当前用户发送的消息
            msgInstance.id = message.id;
            run(this.composer.middleware(), { message: msgInstance });
            return;
          }
        }
      }

      next();
    });

    this.callbackComposer.use(mediaMiddleware.callbackMiddleware());
  }

  // 开始监听机器人的消息
  public startListening() {
    this.botClient.addEventHandler((event) => {
      run(this.composer.middleware(), event);
      run(this.newMsgComposer.middleware(), event);
    }, new NewMessage({}));

    this.botClient.addEventHandler((event) => {
      run(this.callbackComposer.middleware(), event);
    }, new CallbackQuery({}));
  }
}
