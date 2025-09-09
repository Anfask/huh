# -------- Base Stage --------
FROM node:20-alpine AS base

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Generate Prisma Client — must be done after install so client is ready
COPY prisma ./prisma
RUN npx prisma generate

# ENV NODE_OPTIONS="--max-old-space-size=512" 
EXPOSE 3000

# -------- Development Stage --------
FROM base AS development

# Copy entire project
COPY . .

# Start in dev mode
CMD ["npm", "run", "dev"]

# -------- Build Stage --------
FROM development AS build

ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ARG NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
ENV NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=${NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}

# Build Next.js app
RUN npm run build

# # -------- Production Stage --------
FROM node:20-alpine AS production

WORKDIR /app

# Copy production files
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma

# ENV NODE_OPTIONS="--max-old-space-size=512"

CMD ["node", "start"]