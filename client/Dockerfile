# Use Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the app
COPY . .


# Expose Vite dev port (default 5173)
EXPOSE 5173

# make sure to run vite on all network interfaces
CMD ["npm", "run", "dev", "--", "--host"]
