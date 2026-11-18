# Scheduling template

Current release process: this MIT-licensed application runs app checks and builds
in its own CI. Neander maintainers manually verify and publish template releases
from private CI; contributors need no private workflow or publishing credentials.
The workflow pins and publication runs below describe the original onboarding.
See the repository README for current local setup and contributor instructions.


This repository is the Saffron scheduling application copied from Neander project
`proj_b554a66e6f58`, source commit
`c5f9c0c2147a2b2c30fa6b5849dc962e520c7c89` (the deployed commit at extraction).
The initial GitHub commit `4060c53a` contains the same 164 tracked files, byte for
byte. Application pages, styles, API handlers, Better Auth configuration,
PostgreSQL/Drizzle schema and committed migrations are preserved.

`neanderhq/calendly-template` replaces the unrelated `neanderhq/calendly-clone`
under the existing catalog ID `calendly`. The library title is **Scheduling**;
the application itself remains branded **saffron**.

## Contract and release

- `.neander/template.yaml` supplies library metadata, the screenshot thumbnail,
  verification commands and seed entry point.
- `.neander/compose.yaml` remains the standard `nextjs-drizzle` publishing recipe.
  It supplies the managed PostgreSQL connection and Better Auth runtime settings.
  `DEMO_HOST_PASSWORD` is an additional generated opaque secret used only when
  initializing the fictional host account.
- `.github/workflows/template.yml` calls the shared workflow at
  `245ba83dff797bbef892d2755a1373b8229d5369`, whose private installer is pinned to
  `620f1f00f9cd3509bd0920e74a19055826581ea4`.
- Pull requests verify the complete release without publishing. A successful
  default-branch run publishes the image to Artifact Registry, the release JSON
  to the template catalog GCS bucket, and the thumbnail to the configured asset
  bucket. These destinations come from organization `TEMPLATE_*` variables.
  The source reference is this GitHub repository and its exact commit; no source
  archive is uploaded. Verification reports stay in GitHub Actions artifacts.

The product integration that consumes these releases, provisions a user's
database and deploys an image is separate. This repository supplies the existing
publishing recipe and seed command; it does not implement a second deploy path.

## Fictional workspace and login

The seed creates Maya Chen (`maya.chen@example.invalid`, username `maya-chen`) in
UTC with a 30-minute **Discovery call**, weekday availability, a booking question,
three contacts, two upcoming and one historical meeting, a meeting poll with two
options and a sample vote, and a shareable event link. Addresses use the reserved
`example.invalid` domain. Future meeting dates are relative to first initialization.
The public booking page is `/maya-chen/discovery-call`.

The initial password comes from `DEMO_HOST_PASSWORD`, never a shared default.
Better Auth's own password hasher creates the normal credential account. The
future provisioning consumer must generate this secret, pass it to the seed
command, and make the initial credential available to the project owner. It must
not put the password in the public catalog, thumbnail or browser bundle. The app's
normal `/signup` and `/login` flows are unchanged.

For local use, set a unique password of at least 12 characters in `.env.local`,
then run `pnpm db:migrate` and `pnpm db:seed` against a new local database. Log in
at `/login` with the fictional email and that password.

Initialization runs in one PostgreSQL transaction under an advisory lock. A
successful existing seed is left alone, including user edits, passwords and
deleted children. A failed transaction rolls back and can be retried. It does
not reset an existing customer's database or copy data from the source project.

## Verification and thumbnail

Use Node 24.21.0 and pnpm 11.18.0 from `mise.toml`. The Docker build/runtime are
also pinned to Node 24.21.0. Supply a freshly created disposable PostgreSQL
database to the shared checker:

```sh
export NEANDER_TEMPLATE_TEST_DATABASE_URL='postgresql://template:template@127.0.0.1:55489/template_check'
export NEANDER_TEMPLATE_TEST_ORIGIN='http://127.0.0.1:18089'
neander-template check .
neander-template verify .
# Requires a clean committed checkout; keep output outside the repository.
neander-template prepare-release . --output /tmp/calendly-template-release
```

The checker installs locked dependencies, checks TypeScript, runs seed unit tests,
builds Linux/amd64, applies the actual publishing migration helper, seeds and
verifies the built image. The verification uses Chromium to sign in, load the
seeded dashboard and all six sections, and open the public booking page. It books
a real slot, checks duplicate booking rejection, changes a profile through the
API and verifies persistence after restarting the container. Concurrent seed
retries must preserve the edit, password and a deliberately deleted sample
contact. Existing entrypoint literal-secret, HTTP/static-asset and Better Auth
validation/CSRF/session tests run against this same image. Deployment-example
checks remain a separate lightweight CI job.

The verifier installs its pinned Chromium browser and Linux system dependencies
as needed. It names each app container uniquely and removes it in `finally`.
The database belongs to the caller and must be removed by that caller. macOS
Docker Desktop uses `host.docker.internal`; Linux CI uses host networking against
its disposable service database. This is local/container proof, not a claim of
managed Neon or production Cloud Run deployment verification.

On an ARM development machine whose amd64 emulator cannot run Next.js, the same
image smoke can be run natively after applying migrations and seeding the
disposable database. Set `DATABASE_URL` equal to
`NEANDER_TEMPLATE_TEST_DATABASE_URL`, provide `BETTER_AUTH_URL`,
`BETTER_AUTH_SECRET` and the same `DEMO_HOST_PASSWORD` used to seed, then run:

```sh
docker build --platform linux/arm64 -f .neander/Dockerfile -t calendly-template:local-arm64 .
NEANDER_TEMPLATE_IMAGE=calendly-template:local-arm64 pnpm test:template
```

This is supplemental development evidence. The shared workflow still builds and
verifies Linux/amd64 on its native Linux runner before publishing.

`.neander/thumbnail.png` is a real browser screenshot of this app with its
fictional fixture. To regenerate it explicitly, set
`NEANDER_TEMPLATE_SCREENSHOT` to the desired absolute PNG path when running
verification. Ordinary CI does not rewrite the committed thumbnail.

## Scope of extraction changes

Onboarding adds the manifest/caller, seed, tests, screenshot and this documentation;
adds Playwright as a pinned development dependency; pins the existing Node image;
and declares the initial generated demo password. Existing base CI was adjusted
to run production tests through the configured shared verifier, avoiding the old
bare-container launch that lacked required database and auth settings. No
application behavior, schema or database migrations were changed.
