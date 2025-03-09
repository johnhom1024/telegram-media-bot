import { describe, it, expect } from 'vitest';
import { textToHash } from '@/utils';
import { DownloadMessage } from '@/utils/downloadMessage';

describe('textToHash', () => {
  it('should generate same hash for identical messages', () => {
    const msg1 = new DownloadMessage({
      messageId: '123',
      total: 100,
      downloaded: 50,
      speed: 1.5
    });

    const msg2 = new DownloadMessage({
      messageId: '123',
      total: 100,
      downloaded: 50,
      speed: 1.5
    });

    const hash1 = textToHash(msg1.getMessage());
    const hash2 = textToHash(msg2.getMessage());

    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for messages with different progress', () => {
    const msg1 = new DownloadMessage({
      messageId: '123',
      total: 100,
      downloaded: 50,
      speed: 1.5
    });

    const msg2 = new DownloadMessage({
      messageId: '123',
      total: 100,
      downloaded: 60,
      speed: 1.5
    });

    const hash1 = textToHash(msg1.getMessage());
    const hash2 = textToHash(msg2.getMessage());

    expect(hash1).not.toBe(hash2);
  });

  it('should generate different hashes for messages with different speeds', () => {
    const msg1 = new DownloadMessage({
      messageId: '123',
      total: 100,
      downloaded: 50,
      speed: 1.5
    });

    const msg2 = new DownloadMessage({
      messageId: '123',
      total: 100,
      downloaded: 50,
      speed: 2.0
    });

    const hash1 = textToHash(msg1.getMessage());
    const hash2 = textToHash(msg2.getMessage());

    expect(hash1).not.toBe(hash2);
  });

  it('should generate different hashes for paused and active messages', () => {
    const msg = new DownloadMessage({
      messageId: '123',
      total: 100,
      downloaded: 50,
      speed: 1.5
    });

    const activeHash = textToHash(msg.getMessage());
    msg.setPause(true);
    const pausedHash = textToHash(msg.getMessage());

    expect(activeHash).not.toBe(pausedHash);
  });

  it('should generate different hashes for finished and unfinished messages', () => {
    const msg = new DownloadMessage({
      messageId: '123',
      total: 100,
      downloaded: 100,
      speed: 1.5
    });

    const unfinishedHash = textToHash(msg.getMessage());
    const finishedHash = textToHash(msg.finish());

    expect(unfinishedHash).not.toBe(finishedHash);
  });
});