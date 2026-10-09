# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.4.0
FROM oven/bun:${BUN_VERSION}-slim AS bun

FROM node:22-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS builder
# The portal is built from Git, and optional native dependencies use node-gyp.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git make g++ python3 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /build
COPY --link scripts scripts
RUN chmod +x ./scripts/start.sh
COPY package.json bun.lock ./
RUN CI=true bun install --frozen-lockfile
# Fail the build if the custom settings portal was not compiled.
RUN test -f node_modules/@discord-tickets/settings/build/handler.js
COPY --link . .

FROM base AS runner
LABEL org.opencontainers.image.source=https://github.com/strata-czasu/discord-tickets-bot \
    org.opencontainers.image.description="The most popular open-source ticket bot for Discord." \
    org.opencontainers.image.licenses="GPL-3.0-or-later"

RUN useradd --create-home --home-dir /home/container container \
    && mkdir -p /app /home/container/user /home/container/logs \
    && chown -R container:container /app /home/container

USER container
ENV USER=container \
    HOME=/home/container \
    NODE_ENV=production \
    HTTP_HOST=0.0.0.0 \
    DOCKER=true
WORKDIR /home/container
COPY --from=builder --chown=container:container --chmod=777 /build /app

ENTRYPOINT [ "/app/scripts/start.sh" ]
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s \
    CMD curl -f http://localhost:${HTTP_PORT}/status || exit 1
