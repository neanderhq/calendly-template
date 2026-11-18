# Next.js + TypeScript

This is the Scheduling template extracted from production project
`proj_b554a66e6f58`. See [template onboarding and provenance](docs/template-onboarding.md)
for its release contract, fictional seed, initial login and complete image verification.

Use Node 24 and pnpm 11.18.0. Run `pnpm install --frozen-lockfile`; `pnpm check` checks types and `pnpm build` prepares the production standalone output. The app stores accounts and profiles in PostgreSQL. Start the local database and apply migrations as described below, then run `pnpm dev` at http://127.0.0.1:3000.

Publish uses `.neander/compose.yaml`. For local production verification, use the shared template verifier described in the onboarding guide; it supplies a disposable database and the required auth settings to the built image. `/api/health` returns JSON. `public/` and `.next/static` are copied explicitly into the runtime image.

Use server-side runtime environment variables for callback and backend origins; `NEXT_PUBLIC_*` values are frozen during the build. Keep browser calls relative to `/api`. Never commit `.env` files with credentials. Stack provenance is in `docs/architecture/stack-decision.md`.

Follow the [Drizzle development database setup](.neander/blocks/drizzle/README.md#local-development-database): use local Docker PostgreSQL, an existing development PostgreSQL instance, or optional managed development Neon. The local Compose file is separate from the production recipe. Local credentials belong in ignored `.env.local` only.

For the local Compose setup, create `.env.local` with the loopback `DATABASE_URL` from the Drizzle instructions, a random `BETTER_AUTH_SECRET` of at least 32 characters, and `BETTER_AUTH_URL=http://127.0.0.1:3000`. Then apply the committed migration and launch the preview:

```sh
node --env-file=.env.local .neander/migrate.mjs
pnpm dev
```

The production image build and app startup do not apply migrations or need build-time credentials. Publish supplies the managed Neon URL and generated auth secret through `.neander/compose.yaml`.


## Maintenance and verification

This private Neander template repository owns the application, pinned lockfiles, deployment recipe, and [incremental building blocks](add-ons.md). Changes are reviewed here independently of the Neander application. New projects take a one-time copy of a selected commit; starter updates never overwrite existing projects.

Run from this repository root with a disposable database configured:

```sh
neander-template check .
neander-template verify .
```

The shared CI workflow runs the base container checks, seeded product behavior, database persistence and login checks on every pull request and main push. It applies the committed migrations before running `.neander/check-auth.mjs`.

Pinned dependencies, production recipes, and building blocks were preserved during extraction from Neander. Repeat production certification when dependencies or base-image tags change; local container checks do not establish Cloud Run latency or real OAuth-provider login. No open-source license is granted by this private repository.

## Keeping Publish ready

Follow [the deployment contract](docs/deployment-contract.md) when changing database or authentication setup. Keep the maintained production recipe in sync with this implementation.

## License

[MIT](LICENSE). Third-party components retain their respective licenses and
existing attribution notices.

## Public CI and Neander releases

Public CI installs locked dependencies, checks types/syntax, runs app tests and
builds the application. It requires no Neander publishing credentials or private
tools. Neander's private release workflow separately verifies the committed
application image with a disposable database, then publishes it to the template
catalog. Existing projects continue through normal editing and Publish.
