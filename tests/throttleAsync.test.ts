import { describe, it, expect, vi } from "vitest";
import { throttleAsync } from "../src/utils/utils";

describe("throttleAsync", () => {
  it("应该正确执行异步函数", async () => {
    const mockFn = vi.fn().mockResolvedValue("result");
    const throttled = throttleAsync(mockFn);
    const result = await throttled();
    expect(result).toBe("result");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("应该在指定延迟时间内忽略重复调用", async () => {
    const mockFn = vi.fn().mockResolvedValue("result");
    const delay = 100;
    const throttled = throttleAsync(mockFn, { delay });

    // 第一次调用
    const result1 = await throttled();
    // 立即进行第二次调用
    const result2 = await throttled();

    expect(result1).toBe("result");
    expect(result2).toBe(undefined);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // 等待延迟时间过后再次调用
    await new Promise(resolve => setTimeout(resolve, delay + 10));
    const result3 = await throttled();
    expect(result3).toBe("result");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("应该保持正确的this上下文", async () => {
    const obj = {
      value: "test",
      async method() {
        return this.value;
      },
    };

    const throttled = throttleAsync(obj.method.bind(obj));
    const result = await throttled();
    expect(result).toBe("test");
  });

  it("应该正确传递参数", async () => {
    const mockFn = vi.fn().mockImplementation(async (a: number, b: string) => `${a}-${b}`);
    const throttled = throttleAsync(mockFn);

    const result = await throttled(1, "test");
    expect(result).toBe("1-test");
    expect(mockFn).toHaveBeenCalledWith(1, "test");
  });

  it("应该在连续多次调用时只执行第一次", async () => {
    const mockFn = vi.fn().mockResolvedValue("result");
    const throttled = throttleAsync(mockFn, { delay: 100 });

    // 连续调用多次
    const results = await Promise.all([
      throttled(),
      throttled(),
      throttled(),
      throttled(),
    ]);

    expect(results).toEqual(["result", undefined, undefined, undefined]);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("应该在错误发生时仍然保持节流行为", async () => {
    const error = new Error("test error");
    const mockFn = vi.fn().mockRejectedValue(error);
    const throttled = throttleAsync(mockFn, { delay: 100 });

    await expect(throttled()).rejects.toThrow(error);
    const result = await throttled(); // 立即第二次调用
    expect(result).toBe(undefined);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});