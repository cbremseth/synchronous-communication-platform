FROM node:lts-alpine

# Add build argument with production as default
ARG APP_ENV=production
ENV APP_ENV=${APP_ENV}

WORKDIR /usr/src/app

COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]

# Install dependencies based on APP_ENV
RUN if [ "$APP_ENV" = "production" ]; \
    then npm install --production --silent && mv node_modules ../; \
    else npm install --silent && mv node_modules ../; \
    fi

COPY . .
EXPOSE 5001
RUN chown -R node /usr/src/app
USER node

# Use different commands for dev and prod
CMD if [ "$APP_ENV" = "production" ]; \
    then node index.js; \
    else npm run dev; \
    fi
