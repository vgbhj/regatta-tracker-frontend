FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json .npmrc ./
RUN npm ci

COPY . .

ARG VITE_DEFAULT_RACE_SOURCE=server
ARG VITE_DEMO_AUTOLOAD_RACE=true
ENV VITE_DEFAULT_RACE_SOURCE=$VITE_DEFAULT_RACE_SOURCE
ENV VITE_DEMO_AUTOLOAD_RACE=$VITE_DEMO_AUTOLOAD_RACE

RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
