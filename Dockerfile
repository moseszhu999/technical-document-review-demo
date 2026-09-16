FROM php:8.3-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libonig-dev libcurl4-openssl-dev ca-certificates \
    && docker-php-ext-install mbstring curl \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . .

RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV LOG_CHANNEL=stderr
ENV LOG_LEVEL=debug
ENV CACHE_STORE=array
ENV SESSION_DRIVER=array
ENV QUEUE_CONNECTION=sync

EXPOSE 10000

CMD ["sh", "-c", "export APP_KEY=\"base64:$(php -r 'echo base64_encode(random_bytes(32));')\"; export PHP_CLI_SERVER_WORKERS=4; exec php -d output_buffering=0 -d zlib.output_compression=0 -S 0.0.0.0:${PORT:-10000} -t public public/router.php"]
