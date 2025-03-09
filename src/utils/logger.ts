import winston from "winston";
import dayjs from "./dayjs";

const { combine, timestamp, printf } = winston.format;

const myFormat = printf(({ level, message, timestamp, ...rest }) => {
  // 如果 message 是对象，将其转换为字符串
  const msg =
    typeof message === "object" ? JSON.stringify(message, null, 2) : message;

  // 如果有额外的元数据，也将其添加到日志中
  const meta = Object.keys(rest).length
    ? `\n${JSON.stringify(rest, null, 2)}`
    : "";

  return `${timestamp} [${level}]: ${msg} ${meta}`;
});

const logger = winston.createLogger({
  level: "info",
  format: combine(
    timestamp({
      format: () => {
        return dayjs().tz().format("YYYY-MM-DD HH:mm:ss");
      },
    }),
    myFormat
  ),
  transports: [
    new winston.transports.File({
      filename: "./log/error.log",
      level: "error",
      tailable: true,
      maxFiles: 10,
      maxsize: 1024 * 1024 * 5,
    }),
    new winston.transports.File({
      filename: "./log/combined.log",
      tailable: true,
      maxFiles: 10,
      maxsize: 1024 * 1024 * 5,
    }),
    new winston.transports.Console({
      format: combine(
        timestamp({
          format: () => {
            return dayjs().tz().format("YYYY-MM-DD HH:mm:ss");
          },
        }),
        myFormat
      ),
    }),
  ],
});

export default logger;
