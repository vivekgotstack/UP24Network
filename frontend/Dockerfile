# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS dependencies
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM dependencies AS build
COPY frontend/ ./
ARG SITE_URL
ARG NEWS_API_URL=http://backend:8080
ENV SITE_URL=$SITE_URL NEWS_API_URL=$NEWS_API_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runtime
RUN addgroup -S -g 10001 up24 && adduser -S -u 10001 -G up24 up24
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=up24:up24 /app/public ./public
COPY --from=build --chown=up24:up24 /app/.next/standalone ./
COPY --from=build --chown=up24:up24 /app/.next/static ./.next/static
RUN mkdir -p .next/cache && chown -R up24:up24 .next/cache
USER up24
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/manifest.webmanifest',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
