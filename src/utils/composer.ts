/*
 * @Date: 2024-12-23 11:17:56
 * @Author: johnhomwang
 * @LastEditors: johnhomwang
 * @Description: 中间件
 * 参考https://github.com/grammyjs/grammY/blob/main/src/composer.ts
 */


/**
 * 想要实现这种中间件的调用方式：
 * 
 * bot.filter(condition, (ctx, next) => {})
 * 
 */

type Context = any

export type MaybeArray<T> = T | T[];
type NextFunction = () => Promise<void>
type MaybePromise<T> = T | Promise<T>

export type MiddlewareFn<C extends Context = Context> = (ctx: C, next: NextFunction,) => MaybePromise<void>

export interface MiddlewareObj<C extends Context = Context> {
  middleware: () => MiddlewareFn<C>
}

export type Middleware<C extends Context = Context> = MiddlewareFn<C> | MiddlewareObj<C>

function pass<C>(_ctx: C, next: NextFunction) {
  return next();
}

// 统一转成MiddlewareFn
function flatten<C extends Context>(mw: Middleware<C>): MiddlewareFn<C> {
  return typeof mw === 'function' ? mw : (ctx, next) => mw.middleware()(ctx, next);
}

function concat<C extends Context>(first: MiddlewareFn<C>, andThen: MiddlewareFn<C>): MiddlewareFn<C> {
  return async (ctx, next) => {
    let nextCalled = false;
    await first(ctx, async () => {
      if (nextCalled) throw new Error("`next` already called before!");
      else nextCalled = true;
      await andThen(ctx, next);
    })
  }
}
const leaf: NextFunction = () => Promise.resolve();

export async function run<C extends Context>(middleware: MiddlewareFn<C>, ctx: C) {
  await middleware(ctx, leaf);
}

export class Composer<C extends Context = Context> implements MiddlewareObj<C> {
  private handler: MiddlewareFn<C>;

  constructor(...middleware: Array<Middleware<C>>) {
    this.handler = middleware.length === 0 ? pass : middleware.map(flatten).reduce(concat);
  }

  middleware() {
    return this.handler;
  }

  use(...middleware: Array<Middleware<C>>) {
    const composer = new Composer(...middleware);
    this.handler = concat(this.handler, flatten(composer));
    return this;
  }

  branch(predicate: (ctx: C) => MaybePromise<boolean>, trueMiddleware: MaybeArray<Middleware<C>>, falseMiddleware: MaybeArray<Middleware<C>>) {
    return this.lazy(async (ctx) => (await predicate(ctx)) ? trueMiddleware : falseMiddleware)
  }

  lazy(middlewareFactory: (ctx: C) => MaybePromise<MaybeArray<Middleware<C>>>): Composer<C> {
    return this.use(async (ctx, next) => {
      const middleware = await middlewareFactory(ctx);
      const arr = Array.isArray(middleware) ? middleware : [middleware];
      await flatten(new Composer(...arr))(ctx, next);
    })
  }

  filter(predicate: (ctx: C) => MaybePromise<boolean>, ...middleware: Array<Middleware<C>>) {
    const composer = new Composer(...middleware);
    this.branch(predicate, composer, pass);
    return composer;
  }
}
