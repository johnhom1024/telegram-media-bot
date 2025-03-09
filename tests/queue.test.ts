import { QueueLimit } from '@/utils/queue';
import { describe, beforeEach, test, it, vi, expect } from 'vitest';

describe('QueueLimit', () => {
  let queueLimit: QueueLimit;

  beforeEach(() => {
    queueLimit = new QueueLimit(2);
  });

  it('should limit the number of concurrent tasks', async () => {
    const task1 = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
    const task2 = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
    const task3 = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));

    queueLimit.add('task1', task1);
    queueLimit.add('task2', task2);
    queueLimit.add('task3', task3);

    // Initially, only two tasks should be running
    expect(task1).toHaveBeenCalled();
    expect(task2).toHaveBeenCalled();
    expect(task3).not.toHaveBeenCalled();

    // Wait for the first two tasks to complete
    await new Promise((resolve) => setTimeout(resolve, 150));

    // After the first two tasks complete, the third task should start
    expect(task3).toHaveBeenCalled();
  });

  test('should run when function is add', async () => {
    const fn = vi.fn(() => {
      return Promise.resolve();
    });
    // 监视run方法是否被调用
    const queueLimitRun = vi.spyOn(queueLimit, 'run');
    queueLimit.add('test', fn);
    expect(queueLimitRun).toHaveBeenCalled();
  })

  test('测试任务同时执行的上限', async () => {
    const fn = vi.fn(() => {
      return Promise.resolve();
    });

    queueLimit.add('task1', fn);
    queueLimit.add('task2', fn);
    queueLimit.add('task3', fn);

    expect(queueLimit.runningQueue.length).toBe(2);
    expect(queueLimit.waitQueue.length).toBe(1);
  })

  test('测试任务去重功能', async () => {
    const fn = vi.fn(() => Promise.resolve());
    
    queueLimit.add('task1', fn);
    queueLimit.add('task1', fn); // 尝试添加相同key的任务

    expect(queueLimit.runningQueue.length).toBe(1);
    expect(queueLimit.waitQueue.length).toBe(0);
  })

  test('测试任务完成后key的清理', async () => {
    const fn = vi.fn(() => Promise.resolve());
    
    queueLimit.add('task1', fn);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 任务完成后，runningQueue应该被清空
    expect(queueLimit.runningQueue.length).toBe(0);
    
    // 可以重新添加相同key的任务
    queueLimit.add('task1', fn);
    expect(queueLimit.runningQueue.length).toBe(1);
  })

  test('测试多个任务的执行顺序', async () => {
    const executionOrder: string[] = [];
    const createTask = (id: string) => {
      return () => {
        executionOrder.push(id);
        return Promise.resolve();
      };
    };

    queueLimit.add('task1', createTask('1'));
    queueLimit.add('task2', createTask('2'));
    queueLimit.add('task3', createTask('3'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    // 由于限制为2，前两个任务应该先执行
    expect(executionOrder).toContain('1');
    expect(executionOrder).toContain('2');
    expect(executionOrder.length).toBe(3);
  })
})
