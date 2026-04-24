# dockerfile
# $ docker build -t grindurus-app .

FROM node:22.10.0-slim AS builder

# build tools для native модулей
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@11.6.0
WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001