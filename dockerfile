FROM node:16.13.2-alpine
WORKDIR /Bot1
ENV PORT 88
COPY package.json /Bot1/package.json
RUN npm install
COPY . .
CMD ["node", "index.js"]