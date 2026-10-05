# backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run dev:backend
```

DOCKER must be installed on the device!

""dev:backend"" was added to the root package.json so that it starts dev.db.docker-compose.yml and then index.ts.

It creates a local dev database in a docker container so that it can be easly deployed and tested.

In the root of the project it was .env.example was created, this file serves as a template for the real .env file which is needed to make the container work:
> [!WARNING]
> Remember to copy and change the contents from .env.example into the real .env file, otherwise the container cannot be deployed.

If you stop the the server usig ctrl+c remember to stop the container (it is not implemented yet, i'm lazy)

This project was created using `bun init` in bun v1.4.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
