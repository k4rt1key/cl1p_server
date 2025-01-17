FROM node:21-alpine3.18

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --silent
RUN npm install pm2 --save

COPY . .

EXPOSE 5000

CMD ["pm2","start", "app.js"]
