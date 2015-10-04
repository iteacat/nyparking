FROM node:4.1.1
COPY . /build
RUN npm install pm2 -g && \
    npm install bunyan -g && \
    mkdir -p /var/logs && \
    cd /build && \
    npm install

EXPOSE 3000
VOLUME /var/logs
ENV NODE_ENV=prod PORT=3000 NODE_PATH=/build
CMD ["node", "/build/bin/www"]
