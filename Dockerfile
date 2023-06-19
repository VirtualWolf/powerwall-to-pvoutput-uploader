FROM node:18.16.0-bookworm-slim AS base

FROM base AS build
RUN mkdir -p /opt/build
WORKDIR /opt/build
COPY package*.json tsconfig*.json ./
RUN npm ci
COPY src src
RUN npm run build

FROM base AS release
RUN mkdir -p /opt/service && chown -R node: /opt/service
USER node
WORKDIR /opt/service
COPY --chown=node:node package*.json knexfile.js ./
RUN npm ci --omit dev && rm -rf /home/node/.npm
COPY --chown=node:node migrations migrations
COPY --chown=node:node --from=build /opt/build/dist /opt/service/dist

CMD ["npm", "start"]
