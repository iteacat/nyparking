#!/bin/bash
npm install
NODE_ENV=prod PORT=3000 node ./bin/www 2> console-stderr.txt
