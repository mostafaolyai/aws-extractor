FROM node:14.17.2


WORKDIR /home/runner/app


RUN groupadd -r runner \
  && useradd -r -g runner -G audio,video runner \
      && mkdir -p /home/runner/Downloads \
      && chown -R runner:runner /home/runner

USER runner

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build



CMD ["npm", "start"]
