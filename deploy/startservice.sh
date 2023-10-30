#!/bin/bash
cd /var/www/html
NODE_ENV=production /usr/bin/pm2 start app.mjs