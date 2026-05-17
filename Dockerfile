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

ENV NGINX_ENVSUBST_OUTPUT_DIR=/usr/share/nginx/html
ENV VITE_DISPATCH_DRIVER_ROUTE_URL=https://contractor.ghstickets.com/dispatch/driver
ENV VITE_DISPATCH_DRIVER_LOCATION_ENDPOINT=https://contractor.ghstickets.com/api/dispatch-driver-location

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/dispatch-config.template.js /etc/nginx/templates/dispatch-config.js.template
COPY --from=build /app/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
