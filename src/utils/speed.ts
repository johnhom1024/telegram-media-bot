
interface MediaStat {
  lastUpdateTime: number;
  downloaded: number;
  // 速度，单位是KB/s
  speed: number;
}

type MessageId = number;

// 记录下载速度
class DownloadStat {

  mediaStatMap = new Map<MessageId, MediaStat>()

  public updateDownloadResult(payload: { messageId: MessageId; downloaded: number}) {
    const { messageId, downloaded } = payload;
    const mediaStat = this.mediaStatMap.get(messageId);
    if (!mediaStat) {
      this.mediaStatMap.set(messageId, {
        lastUpdateTime: Date.now(),
        downloaded: downloaded,
        speed: 0,
      });
      return;
    }

    const {lastUpdateTime, downloaded: lastDownloaded} = mediaStat;
    const currentTime = Date.now();
    if (currentTime === lastUpdateTime) {
      return;
    }
    // 这里得到MB/s
    // * 1000 是为了转换成秒，再得到MB需要除以1000 * 1000，所以这里直接除以1000 得到 MB/s
    const speed = (downloaded - lastDownloaded) / (currentTime - lastUpdateTime)  / 1000;
    this.mediaStatMap.set(messageId, {
      lastUpdateTime: Date.now(),
      downloaded: downloaded,
      // 四舍五入保留两位小数
      speed: Math.round(speed * 100) / 100,
    });
  }

  // 删除下载信息，下载完成之后调用
  remove(messageId: MessageId) {
    this.mediaStatMap.delete(messageId);
  }

  public getSpeed(messageId: MessageId) {
    const mediaStat = this.mediaStatMap.get(messageId);
    if (!mediaStat) {
      return 0;
    }
    return mediaStat.speed;
  }
}

const downloadStat = new DownloadStat();

export {
  downloadStat,
}
