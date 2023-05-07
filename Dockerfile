FROM node:18-alpine

# Create and change to the app directory.
WORKDIR /home/node/app
# Copy application dependency manifests to the container image.
# A wildcard is used to ensure copying both package.json AND package-lock.json (when available).
# Copying this first prevents re-running npm install on every code change.
COPY package*.json ./
COPY . ./
# Install production dependencies.
# If you add a package-lock.json, speed your build by switching to 'npm ci'.
# RUN npm ci --only=production
RUN yarn
RUN npx tsc
RUN yarn build
#  install ffmpeg
RUN apk add --no-cache ffmpeg

# Copy local code to the container image.


# Run the web service on container startup.
CMD [ "yarn", "start" ]