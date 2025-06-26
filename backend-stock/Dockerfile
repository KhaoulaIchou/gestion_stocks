FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build  # très important !

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
