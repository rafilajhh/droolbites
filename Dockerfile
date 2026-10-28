# Production image for Droolbites (Next.js standalone server).
# Local hosting:  docker compose --profile app up -d --build   →  http://localhost:8080

FROM node:22-alpine AS deps
WORKDIR /app
# prisma.config.ts reads DATABASE_URL; generating the client does not connect.
ENV DATABASE_URL="mysql://build:build@localhost:3306/build"
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# One-off migrations / seed: docker compose --profile app run --rm migrate
FROM deps AS migrate
COPY . .
CMD ["npx", "prisma", "migrate", "deploy"]

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
RUN mkdir -p public/uploads && chown app:app public/uploads
USER app
EXPOSE 3000
CMD ["node", "server.js"]
