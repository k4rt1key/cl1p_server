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

# Use npm start instead of pm2 for simpler container management
CMD ["npm", "start"]
