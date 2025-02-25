# syntax=docker.io/docker/dockerfile:1

FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g corepack@latest
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY ./package.json ./
COPY ./pnpm-lock.yaml ./

# Install dependencies based on the preferred package manager
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS dev-runner
WORKDIR /usr/src/app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 5001

# Use different commands for dev and prod
CMD if [ "$APP_ENV" = "production" ]; \
    then node server.js; \
    else pnpm dev; \
    fi
