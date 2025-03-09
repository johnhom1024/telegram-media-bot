const ProgressTotal = 15;

export class DownloadMessage {
  messageId: string | number;
  // 这里单位都是MB
  total: number;
  downloaded: number = 0;
  speed: number = 0;
  finished: boolean = false;
  // 当前是否暂停
  pause: boolean = false;

  constructor(payload: {
    messageId: string | number;
    total: number;
    downloaded?: number;
    speed?: number;
  }) {
    const { messageId, total, downloaded, speed } = payload;
    this.messageId = messageId;
    this.total = total;
    this.downloaded = downloaded || 0;
    this.speed = speed || 0;
  }
  get msgIdLine() {
    return `🆔 message id: ${this.messageId}\n`;
  }
  get totalLine() {
    return `📏 : ${this.total}MB\n`;
  }

  get downloading() {
    return `📥 : 下载中\n`;
  }

  get speedLine() {
    let speed = this.formatSpeed(this.speed);
    if (this.pause) {
      speed = '已暂停';
    }
    return `🚀 : ${speed}\n`;
  }

  get finishedLine() {
    return `🎉 : 下载完成\n`;
  }

  get progressLine() {
    const progress = Math.round((this.downloaded / this.total) * 100);
    const progressBarText = this.generateProgressBar(progress);
    return `🎬 : ${progressBarText}`;
  }

  public update(payload: { downloaded?: number; speed?: number; total?: number }) {
    const { downloaded, speed, total } = payload;
    this.downloaded = downloaded || 0;
    this.speed = speed || 0;
    this.total = total || 0;
  }

  public finish() {
    this.finished = true;
    return this.getMessage();
  }

  public setPause(pause: boolean) {
    this.pause = !!pause;
    if (this.pause) {
      this.speed = 0;
    }
    return this.getMessage();
  }


  public getMessage() {
    const common = `${this.msgIdLine}${this.totalLine}`;
    if (this.finished) {
      return `${common}${this.finishedLine}`;
    }
    return `${common}${this.speedLine}${this.progressLine}`;
  }

  // 获取不带进度条的消息
  public getMessageWithoutProgress() {
    return `${this.msgIdLine}${this.totalLine}${this.downloading}`;
  }

  /**
   * @description: 格式化速度显示
   * @param {number} speed 速度，单位是MB/s
   * @return {string} 格式化后的速度字符串
   */
  public formatSpeed(speed: number): string {
    if (speed >= 1) {
      return `${speed.toFixed(2)} MB/s`;
    } else if (speed >= 0.001) {
      return `${(speed * 1000).toFixed(2)} KB/s`;
    } else {
      return `${(speed * 1000 * 1000).toFixed(2)} B/s`;
    }
  }

  private generateProgressBar(progress: number): string {
    if (progress < 0) {
      progress = 0;
    }
    if (progress > 100) {
      progress = 100;
    }
    const filledLength = Math.round((progress / 100) * ProgressTotal);
    const emptyLength = ProgressTotal - filledLength;
    const filledPart = '█'.repeat(filledLength);
    const emptyPart = '░'.repeat(emptyLength);
    return `[${filledPart}${emptyPart}]（${progress}%）`;
  }
}
