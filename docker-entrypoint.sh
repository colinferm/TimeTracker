#!/bin/bash
set -e

service redis-server start
cd /var/www/html/api/lib && composer update
cd /usr/src/timetracker && gulp refresh
gulp watch &

exec apachectl -D FOREGROUND