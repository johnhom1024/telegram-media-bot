/**
 * @description: 异步节流工具函数
 * @param fn
 * @param options 配置选项
 * @param {number} options.delay {number}: 延迟时间
 * @returns
 */
export function throttleAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  { delay = 1000 } = {}
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let isPending = false;
  return function (this: unknown, ...args: Parameters<T>): Promise<ReturnType<T>> {
    if (isPending) {
      return Promise.resolve(undefined as ReturnType<T>);
    }
    isPending = true;
    return fn.call(this, ...args).finally(() => {
      setTimeout(() => {
        isPending = false;
      }, delay);
    });
  };
}
