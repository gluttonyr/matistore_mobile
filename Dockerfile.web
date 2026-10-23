# MatiStore website (web build of this Expo app), served by nginx. Used by Dokploy.

# ---- build: same code as the mobile app, exported as a static single-page site ----
FROM node:22-alpine AS build
WORKDIR /app
ENV CI=1 EXPO_NO_TELEMETRY=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx expo export --platform web --output-dir dist

# ---- runtime: static files only ----
FROM nginx:1.27-alpine
COPY nginx.web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
