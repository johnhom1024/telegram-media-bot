
export class DownloadController {
  public isPaused = false;
  public isCancel = false;

  public resumePromise: Promise<void> | null = null;
  public resolveResume: (() => void) | null = null;

  // 如果暂停了，则新建一个Promise，去阻塞后续的下载
  public pauseDownload() {
    this.isPaused = true;
    this.resumePromise = new Promise((resolve) => {
      this.resolveResume = resolve;
    });
  }
  // 恢复下载，这里resolveResume，让暂停的Promise执行
  public resumeDownload() {
    this.isPaused = false;
    this.resolveResume?.();
    this.resolveResume = null;
    this.resumePromise = null;
  }

  public cancelDownload() {
    this.isCancel = true;
  }
}