import yaml from 'js-yaml';
import fs from 'fs';
import { get } from 'lodash';
import deepmerge from 'deepmerge';
import logger from './utils/logger';

interface Proxy {
  ip: string;
  port: number;
  socks_type: 4 | 5;
}

export interface CommonConfig {
  file_path_prefix: string[];
  save_path: string;
  api_hash: string;
  api_id: number;
  bot_token: string;
  proxy?: Proxy;
  // 最大同时可下载的媒体数量
  max_parallel_download: number;
}

const defaultConfig: Partial<CommonConfig> = {
  file_path_prefix: ['message_id'],
  save_path: './downloads',
  max_parallel_download: 5,
};

class Config {
  private _config: CommonConfig;
  constructor() {
    const config = yaml.load(
      fs.readFileSync('config.yaml', 'utf8')
    ) as CommonConfig;
    // 深度合并
    this._config = deepmerge(defaultConfig, config, {
      arrayMerge: (target, source) => {
        return source;
      },
    });
    logger.info('config', this._config);

    global.appConfig = this._config;
  }

  getConfig(key: string) {
    return this._config[key as keyof CommonConfig];
  }
}

export default new Config();
