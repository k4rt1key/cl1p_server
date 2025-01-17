FROM node:21-alpine3.18

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package*.json ./

# Install dependencies
RUN npm install --silent

# Copy the rest of the application
COPY . .

# Expose the required port
EXPOSE 5000

# Use npx to run pm2 without global install
CMD ["npx", "pm2", "start", "app.js"]
