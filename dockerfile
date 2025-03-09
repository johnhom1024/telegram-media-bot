FROM node:22-alpine

# 创建并切换到app目录
WORKDIR /app

# 赋值需要的数据到工作目录
COPY . .

# 运行机器人服务
CMD ["npm", "run", "start:prod"]
