# 第一阶段：构建
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=4096"
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# 跳过 vue-tsc 类型检查，生产构建仅需 vite build
RUN npx vite build

# 第二阶段：生产运行
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
