###
## App
###
BASE_PATH=/crowdcraft-settings-service/v1
PORT=3004
NODE_ENV=development
SERVICE_NAME=crowdcraft-settings-service

###
## TypeOrm PG
###
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=pg
DB_PASSWORD=pg
DB_NAME=crowdcraft
DB_SCHEMA=work

###
## Rabbit MQ
###
RABBIT_MQ_HOST=localhost
RABBIT_MQ_USERNAME=mq
RABBIT_MQ_PASSWORD=mq

###
## Redis
###
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_PASSWORD=redis
REDIS_DB=0

###
## Auth
###
ISSUER=https://crowdcraftb2c.b2clogin.com/c76d11f4-fdad-48c4-a0cc-f2c4eba3be43/v2.0/
JWKS_URI=https://crowdcraftb2c.b2clogin.com/crowdcraftb2c.onmicrosoft.com/b2c_1_signin_signup/discovery/v2.0/keys
# M2M
AUTH_SA_TOKEN_URL=https://crowdcraftb2c.b2clogin.com/crowdcraftb2c.onmicrosoft.com/b2c_1_signin_signup/oauth2/v2.0/token
AUTH_SA_SCOPE=https://crowdcraftb2c.onmicrosoft.com/0872697b-d08b-4a1c-88a8-4033c7c2011f/.default
AUTH_SA_CLIENT_ID=10712f5b-80c9-4e78-b26b-5d759c24de84
AUTH_SA_CLIENT_SECRET=<secret-here>

###
## Services
###
PAYMENT_BASE_URL=https://test-api.crowdcraft.io/crowdcraft-payment-service/v1
WORK_BASE_URL=https://test-api.crowdcraft.io/crowdcraft-work-service/v1
PARTY_BASE_URL=https://test-api.crowdcraft.io/crowdcraft-party-service/v1
