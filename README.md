# CrowdCraft settings Service


### Quick start

The service uses the following key dependencies/tooling:

- Platform: Node JS `v20.1.3` / Typescript 5
- Local builds: [tsx](https://github.com/esbuild-kit/tsx)
- Prod build: [pkgroll](https://github.com/privatenumber/pkgroll)
- ORM: [typeorm](https://www.typeorm.io/)
- Database: Postgres
- Typescript types generator: [openapi-typescript](https://github.com/drwpow/openapi-typescript)
- Open API Validator: [openapi-typescript-validator](https://github.com/Q42/openapi-typescript-validator)

Steps to run:

- Follow the `.env.example` file and place a `.env` file in the project root.
- Export your github personal access token into `PACKAGE_REGISTRY_TOKEN` env var.
- Run the deps and work-server using:
```shell
docker compose --profile app up --build --force-recreate
```
- If you only want to run deps, use:
```shell
docker compose up
```

- If building directly through command-line use -
```shell
DOCKER_BUILDKIT=1 docker build --secret "id=package_registry_token,env=PACKAGE_REGISTRY_TOKEN" .
```
- To see the output of the run commands while building the image, set the env variable before running docker compose:
```shell
BUILDKIT_PROGRESS=plain
```

Use the postman collection in `backend/postman` to test the service.

Testing TODO
