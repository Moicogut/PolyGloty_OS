# Polyglot Voice - Container para despliegue en la nube (Docker / Cloud Run / Railway / Render)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copiar manifiesto y código fuente (Zero-dependency core)
COPY package.json ./
COPY lib/ ./lib/
COPY public/ ./public/
COPY server.js ./
COPY supabase/ ./supabase/

# Carpeta de almacenamiento para datos locales y caché
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
