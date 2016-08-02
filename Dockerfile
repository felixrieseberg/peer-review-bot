FROM node:6
MAINTAINER haibzhou <zhouhaibing089@gmail.com>

WORKDIR /peer-review-bot
ADD . /peer-review-bot
RUN npm install
ENTRYPOINT ["npm", "start"]
