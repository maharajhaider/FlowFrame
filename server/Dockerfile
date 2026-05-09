FROM node:20-bullseye

# Install Python 3 + pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    pip3 install --no-cache-dir flask sentence-transformers && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*


WORKDIR /app

COPY package*.json ./

#Faster than npm install More predictable (uses exact versions) Best for CI/CD & Docker builds --production: Tells npm to install only production dependencies, i.e., it skips devDependencies. This is perfect for Docker containers where you only need what's required to run the app — not to test, lint, or build it.

RUN npm ci --production

COPY . .

#Tells libraries like Express to behave in optimized ways (less logging, more performance)
ENV NODE_ENV=production
EXPOSE 8000
CMD ["node", "src/server.js"]