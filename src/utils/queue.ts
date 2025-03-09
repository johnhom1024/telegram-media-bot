/*
 * @Date: 2024-12-31 17:57:06
 * @Author: johnhomwang
 * @LastEditors: johnhomwang
 * @Description: 下载媒体队列，限制同时可以下载媒体的数量
 */

import EventEmitter from "events";
import TypedEmitter from "typed-emitter";

type MaybePromise<T> = T | Promise<T>;

type RunFunction = () => MaybePromise<any>;

type QueueItem = {
  key: string;
  fn: RunFunction;
  isPause?: boolean;
};

type QueueEvents = {
  continue: (key: string) => void;
}

export class QueueLimit {
  public waitQueue: QueueItem[] = [];
  public runningQueue: QueueItem[] = [];
  public pauseQueue: QueueItem[] = [];
  public limit: number;
  public emitter = new EventEmitter() as TypedEmitter<QueueEvents>;

  constructor(limit?: number) {
    this.limit = limit || 5;
  }

  public hasTask(key: string): boolean {
    return (
      this.waitQueue.some((item) => item.key === key) ||
      this.runningQueue.some((item) => item.key === key)
    );
  }

  public add(key: string, fn: RunFunction) {
    if (this.hasTask(key)) {
      return;
    }
    this.waitQueue.push({ key, fn });
    this.run();
  }

  // 获取正在进行中的任务数量
  get runningCount() {
    return this.runningQueue.length;
  }

  public async run() {
    if (this.runningCount >= this.limit) {
      return;
    }

    const item = this.waitQueue.shift();
    if (item) {
      this.runningQueue.push(item);
      // 如果这个任务是之前暂停的，那么向外发送事件继续下载，然后跳过这里的执行
      if (item.isPause) {
        this.emitter.emit('continue', item.key);
        return;
      }
      try {
        await item.fn();
      } finally {
        this.runningQueue = this.runningQueue.filter((qItem) => qItem.key !== item.key);
        this.run();
      }
    }
  }

  /**
   * 将正在进行中的任务移到暂停队列中
   * @param key 
   */
  public pauseTask(key: string) {
    // 设置某个任务的isPause为true
    const findIndex = this.runningQueue.findIndex((item) => {
      if (item.key === key) {
        item.isPause = true;
        this.pauseQueue.push(item);
        return true;
      }
      return false;
    });

    if (findIndex > -1) {
      this.runningQueue.splice(findIndex, 1);
    }
    // 执行下一个任务
    this.run();
  }

  // 将某个任务移到等待队列中
  public continueTask(key: string) {
    const findIndex = this.pauseQueue.findIndex((item) => {
      if (item.key === key) {
        this.waitQueue.push(item);
        return true;
      }
    });

    if (findIndex > -1) {
      this.pauseQueue.splice(findIndex, 1);
    }

    this.run();
  }

  // 监听继续事件，执行回调
  continueCallback(cb: (key: string) => any) {
    this.emitter.on('continue', cb);
  }
}
