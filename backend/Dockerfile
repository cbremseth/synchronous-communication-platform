FROM node:lts-alpine

# Add build argument with production as default
ARG APP_ENV=production
ENV APP_ENV=${APP_ENV}

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies based on APP_ENV
RUN if [ "$APP_ENV" = "production" ]; \
    then pnpm install --prod --frozen-lockfile; \
    else pnpm install --frozen-lockfile; \
    fi

COPY . .
EXPOSE 5001

RUN chown -R node /usr/src/app
USER node

# Use different commands for dev and prod
CMD if [ "$APP_ENV" = "production" ]; \
    then node server.js; \
    else pnpm dev; \
    fi
