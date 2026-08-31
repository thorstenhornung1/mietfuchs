# --- Build-Stufe: Frontend bauen ---
FROM node:24-slim AS build
WORKDIR /app

# Erst nur die Manifeste kopieren, damit npm-Layer gecacht werden.
# npm-Workspaces (siehe package.json) installieren alle Pakete in einem Durchgang.
COPY package*.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/
COPY packages/domain/package.json ./packages/domain/
RUN npm install

# Quellcode kopieren und Frontend nach apps/client/dist bauen
COPY . .
RUN npm run build

# Entwicklungsabhängigkeiten (vite, typescript, esbuild …) wieder entfernen — sie machen
# den Großteil von node_modules aus und werden zur Laufzeit nicht gebraucht.
RUN npm prune --omit=dev

# --- Laufzeit-Stufe: schlankes Image, nur was der Server braucht ---
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Bewusst NKA_PORT statt PORT (siehe CLAUDE.md / apps/server/src/index.ts)
ENV NKA_PORT=3001

# Die Verzeichnisstruktur muss erhalten bleiben: Der Server liefert ../../client/dist aus,
# und der Workspace-Symlink node_modules/@mietfuchs/domain zeigt auf packages/domain.
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/client/dist ./apps/client/dist

EXPOSE 3001
# Persistente Daten (db.json + uploads/) als Volume — beim Start anhängen:
#   docker run -p 3001:3001 -v mietfuchs-data:/app/apps/server/data <image>
VOLUME ["/app/apps/server/data"]

CMD ["node", "apps/server/src/index.ts"]
