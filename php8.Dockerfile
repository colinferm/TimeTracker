FROM php:8.3-apache

USER root
RUN ln -sf /bin/bash /bin/sh
RUN touch /root/.vimrc && echo 'set nocompatible' >> /root/.vimrc

# basic environment install.
RUN apt-get update --allow-releaseinfo-change -qq \
  && apt-get install -y default-mysql-client --no-install-recommends \
  && apt-get install -y vim-tiny \
  && apt-get install -y sudo \
  && apt-get install -y libfreetype6-dev libjpeg62-turbo-dev libpng-dev libxml2-dev libzip-dev \
  && apt-get install -y apt-transport-https ca-certificates wget
#  && apt-get install -y apt-transport-https ca-certificates wget software-properties-common

# Install most PHP dependencies
RUN docker-php-ext-install mysqli pdo pdo_mysql soap zip \
  && docker-php-ext-configure gd --with-freetype --with-jpeg \
  && docker-php-ext-install -j$(nproc) gd 

# Install PHP redis support
RUN apt-get install -y redis-server redis-tools libzstd-dev
RUN pecl install igbinary \
  && docker-php-ext-enable igbinary \
  && yes '' | pecl install redis \
  && docker-php-ext-enable redis

# Install XDebug Support
RUN pecl install xdebug-3.5.0 \
  && docker-php-ext-enable xdebug

RUN printf "[xdebug] \
  \nxdebug.mode=develop,debug \
  \nxdebug.client_host=host.docker.internal \
  \nxdebug.start_with_request=yes" >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini

RUN printf "error_reporting=E_ALL" > /usr/local/etc/php/conf.d/error_reporting.ini

RUN printf "memory_limit = 64M \
  \nupload_max_filesize = 64M \
  \npost_max_size = 64M \
  \nmax_execution_time = 60" >> /usr/local/etc/php/conf.d/memory_config.ini

# Set up a development php.ini
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"
RUN printf "LimitRequestLine 32768 \
  \nLimitRequestFields 300" > /etc/apache2/conf-available/request-limits.conf
WORKDIR /etc/apache2/conf-enabled
RUN ln -s  ../conf-available/request-limits.conf request-limits.conf

# Enable Apache mod_rewrite
WORKDIR /etc/apache2/mods-enabled
RUN ln -s ../mods-available/rewrite.load rewrite.load

# Create work user & set web root permissons
RUN useradd -ms /bin/sh -g root -G www-data www-user
RUN chown -R www-data:www-data /var/www/html

# Install PHP Composer libraries
WORKDIR /var/www/html/api/lib
RUN /usr/local/bin/php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" \
  && /usr/local/bin/php composer-setup.php \
  && /usr/local/bin/php -r "unlink('composer-setup.php');" \
  && mv composer.phar /usr/local/bin/composer

# Set up Node.js and Gulp to process JS/CSS/SASS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs \
  && node --version \
  && npm --version

RUN mkdir -p /usr/src/timetracker/package
COPY package.json /usr/src/timetracker
COPY gulpfile.js /usr/src/timetracker
WORKDIR /usr/src/timetracker

RUN npm install
RUN npm install -g gulp-cli

# Start the container with a few tasks
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]