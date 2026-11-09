FROM node:24-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts
COPY --chown=node:node assets ./assets
COPY --chown=node:node components ./components
COPY --chown=node:node services ./services
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node server.js index.html ./
RUN mkdir -p /app/data && chown node:node /app/data
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4310 DATA_DIR=/app/data DEMO_MODE=false
EXPOSE 4310
CMD ["node","server.js"]
