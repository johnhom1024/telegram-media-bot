import { LogLevel, Logger } from "telegram/extensions/Logger";
import logger from './logger';

// 重写TelegramClient的Logger
class OverrideTGLogger extends Logger {
  constructor(level?: LogLevel) {
    super(level);
  }

  log(level: LogLevel, message: string) {
    logger.log(level, message);
  }
}

export default new OverrideTGLogger();