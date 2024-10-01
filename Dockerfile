FROM node:20.13.1 AS builder

WORKDIR /app

# Configure package registry
RUN --mount=type=secret,id=package_registry_token,dst=/run/secrets/package_registry_token,uid=1000 \
    ls -ltr /run/secrets \
    && echo "//npm.pkg.github.com/:_authToken=$(cat /run/secrets/package_registry_token)" >> ~/.npmrc

# install deps first so we can cache them
COPY package*.json ./
RUN npm ci && npm cache clean --force

# build the app
COPY . .
RUN ls -alht \
      && npm run generate \
      && npm run build \
      && npm ci --omit dev

# Remove secret
RUN rm ~/.npmrc

FROM node:20.13.1

WORKDIR /app

COPY --from=builder /app/dist dist/
COPY --from=builder /app/node_modules node_modules/

COPY package.json .
COPY openapi.yaml .

ENV PORT=8080
EXPOSE $PORT
ENV NODE_ENV=production
CMD [ "node", "dist/server.mjs" ]
