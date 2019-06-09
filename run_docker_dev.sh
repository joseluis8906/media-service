#!/usr/bin/bash
docker run -i -t \
  --name media-restaurantetic \
  -p 3000:3000 \
  -v $(pwd):/app \
  -d node:10.15.3-stretch