FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production
WORKDIR /usr/share/nginx/html

LABEL org.opencontainers.image.title="WinterWatch-Pro"
LABEL org.opencontainers.image.description="WinterWatch-Pro web application"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist ./

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
