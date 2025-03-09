import { describe, it, expect } from 'vitest';
import { DownloadMessage } from '@/utils/downloadMessage';

describe('DownloadMessage', () => {
  it('should initialize with correct values', () => {
    const msg = new DownloadMessage({
      messageId: '123',
      total: 100,
      downloaded: 50,
      speed: 1.5
    });

    expect(msg.messageId).toBe('123');
    expect(msg.total).toBe(100);
    expect(msg.downloaded).toBe(50);
    expect(msg.speed).toBe(1.5);
    expect(msg.finished).toBe(false);
    expect(msg.pause).toBe(false);
  });

  it('should initialize with default values when optional params not provided', () => {
    const msg = new DownloadMessage({
      messageId: '123',
      total: 100
    });

    expect(msg.downloaded).toBe(0);
    expect(msg.speed).toBe(0);
  });

  it('should update values correctly', () => {
    const msg = new DownloadMessage({
      messageId: '123',
      total: 100
    });

    msg.update({
      downloaded: 30,
      speed: 2.5,
      total: 120
    });

    expect(msg.downloaded).toBe(30);
    expect(msg.speed).toBe(2.5);
    expect(msg.total).toBe(120);
  });

  it('should format speed correctly', () => {
    const msg = new DownloadMessage({
      messageId: '123',
      total: 100
    });

    expect(msg.formatSpeed(1.5)).toBe('1.50 MB/s');
    expect(msg.formatSpeed(0.5)).toBe('500.00 KB/s');
    expect(msg.formatSpeed(0.0005)).toBe('500.00 B/s');
    expect(msg.formatSpeed(0.0000005)).toBe('0.50 B/s');
  });

  it('should generate progress bar correctly', () => {
    const msg = new DownloadMessage({
      messageId: '123',
      total: 100,
      downloaded: 50
    });

    const progressBar = msg.progressLine;
    expect(progressBar).toContain('50%');
    expect(progressBar).toContain('█'.repeat(8)); // 50% of ProgressTotal(15) ≈ 7
    expect(progressBar).toContain('░'.repeat(7)); // remaining part
  });

  it('should handle pause state correctly', () => {
    const msg = new DownloadMessage({
      messageId: '123',
      total: 100,
      speed: 1.5
    });

    const message = msg.getMessage();
    expect(message).toContain('1.50 MB/s');

    msg.setPause(true);
    const pausedMessage = msg.getMessage();
    expect(pausedMessage).toContain('已暂停');

    msg.setPause(false);
    const resumedMessage = msg.getMessage();
    expect(resumedMessage).toContain('0.00 B/s');
  });

  it('should show finished state correctly', () => {
    const msg = new DownloadMessage({
      messageId: '123',
      total: 100
    });

    const normalMessage = msg.getMessage();
    expect(normalMessage).toContain('message id: 123');
    expect(normalMessage).toContain('100MB');
    expect(normalMessage).not.toContain('下载完成');

    const finishedMessage = msg.finish();
    expect(finishedMessage).toContain('下载完成');
    expect(finishedMessage).not.toContain('MB/s');
    expect(finishedMessage).not.toContain('[');
  });

  it('should get message without progress correctly', () => {
    const msg = new DownloadMessage({
      messageId: '123',
      total: 100
    });

    const message = msg.getMessageWithoutProgress();
    expect(message).toContain('message id: 123');
    expect(message).toContain('100MB');
    expect(message).toContain('下载中');
    expect(message).not.toContain('MB/s');
    expect(message).not.toContain('[');
  });
});