import path from 'path';
import fs from 'fs-extra';
import bigInt from 'big-integer';
import { createHash } from 'crypto';

// 存储用户session的文件路径
const userSessionFilePath = path.join(process.cwd(), 'session/user-session');
// 存储bot session的文件路径
const botSessionFilePath = path.join(process.cwd(), 'session/bot-session');

// 把session保存到session/session文件里
export function saveUserSession(session: string | void) {
  if (!session) {
    return;
  }
  // 保存session的内容到session/session文件里
  fs.outputFileSync(userSessionFilePath, session);
}

export function readUserSession(): string {
  if (!fs.existsSync(userSessionFilePath)) return '';
  // 从session/session文件里读取session内容
  return fs.readFileSync(userSessionFilePath, 'utf-8');
}

export function saveBotSession(session: string | void) {
  if (!session) {
    return;
  }
  // 保存session的内容到session/bot-session文件里
  fs.outputFileSync(botSessionFilePath, session);
}

export function readBotSession(): string {
  if (!fs.existsSync(botSessionFilePath)) return '';
  // 从session/bot-session文件里读取session内容
  return fs.readFileSync(botSessionFilePath, 'utf-8');
}

export function formatBigIntToMB(num: bigInt.BigInteger) {
  // 转成mb 因为最大2GB，并没有超过Number可以表示的最大值
  const numInMB = Number(num.toJSNumber() / (1000 * 1000));
  return Math.ceil(numInMB * 10) / 10;
}

// 文本转成hash值
export function textToHash(text: string): string {
  const hash = createHash('sha256');
  hash.update(text);
  return hash.digest('hex');
}
