# =====================================================
# Frontend - multi-stage build (Node build, Nginx serve)
# =====================================================
FROM node:26-alpine AS build

WORKDIR /app

ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Runtime ---
FROM nginx:alpine

# Put the config in /etc/nginx/templates so the nginx image's envsubst step
# renders ${PORT} at startup. PORT defaults to 80 (local docker-compose) and is
# overridden by the PaaS (Railway/Render) at runtime.
ENV PORT=80
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Use 127.0.0.1 (IPv4) — "localhost" resolves to IPv6 ::1 first inside the
# container, which would falsely report unhealthy.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:${PORT:-80}/ || exit 1
