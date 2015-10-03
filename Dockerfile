FROM node:4.1.1
RUN npm install pm2 -g
COPY . /build
RUN cd /build; npm install
EXPOSE 3000
CMD ["NODE_ENV=prod", "PORT=3000", "pm2", "start", "bin/index.js"]
