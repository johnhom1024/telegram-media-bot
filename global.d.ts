type CommonConfig = import('./src/config').CommonConfig;

declare global {
  var appConfig: CommonConfig;
}

export {};
