# Admin SPA — build + nginx
FROM node:20-alpine AS build
WORKDIR /app

# Variáveis Vite são embutidas no build (não em runtime)
ARG VITE_API_URL=
ARG VITE_ENTRA_CLIENT_ID=
ARG VITE_ENTRA_TENANT_ID=
ARG VITE_ENTRA_REDIRECT_URI=https://portal.autofullall.com
ARG VITE_GOOGLE_MAPS_KEY=

ENV VITE_API_URL=$VITE_API_URL \
    VITE_ENTRA_CLIENT_ID=$VITE_ENTRA_CLIENT_ID \
    VITE_ENTRA_TENANT_ID=$VITE_ENTRA_TENANT_ID \
    VITE_ENTRA_REDIRECT_URI=$VITE_ENTRA_REDIRECT_URI \
    VITE_GOOGLE_MAPS_KEY=$VITE_GOOGLE_MAPS_KEY

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner

RUN apk add --no-cache curl \
  && rm -rf /usr/share/nginx/html/* \
  && addgroup -S appgroup 2>/dev/null || true

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
