FROM oven/bun:1.3 AS base
WORKDIR /usr/src/app

COPY . .
RUN bun install --production
RUN bun build:binary

FROM debian:stable-slim AS runtime
WORKDIR /usr/src/app

COPY --from=base /usr/src/app/ynab-connect .

ENV NODE_ENV=production

CMD ["./ynab-connect"]