# Operator quickstart

Every command below was executed on 2026-08-13 against commit `e031fb5`, on a
fresh copy of `kotoba/` with no changes other than the ones this document tells
you to make and undo. Output is transcribed, not paraphrased. Timings are what
the clock said here, not targets. If a step does not reproduce for you, that is
a bug in this document — fix it here rather than working around it in silence.

Environment used: macOS (darwin 25.3.0), Node v26.3.0, npm 11.16.0.

**Only `kotoba/` is runnable.** `xrpc-adapter/` depends on
`@etzhayyim/gtin-kotoba` at `workspace:*` and the extraction from
`etzhayyim/root` left the workspace behind, so there is nothing for that spec to
resolve against. Do not start there.

## 0. Read this before you run `npm install`

On a machine whose **user** `~/.npmrc` contains an `allow-scripts[]` entry, a
plain install dies in about six seconds:

```console
$ cd kotoba && npm install
npm error code 1
npm error git dep preparation failed
npm error command …/npm-cli.js install --force --cache=… --no-audit …
npm error npm warn using --force Recommended protections disabled.
npm error npm error code EALLOWSCRIPTS
npm error npm error --allow-scripts is not allowed in project-scoped installs.
npm error npm error Add the entries to the "allowScripts" field in package.json, or to .npmrc, instead.
```

`@etzhayyim/sdk` is a git dependency that declares `"prepare": "tsc"`, so npm
must build it after cloning. It does that by **re-entering itself** with
`--force`. That nested install inherits the user config's `allow-scripts` as a
command-line flag, and npm rejects `--allow-scripts` on a project-scoped
install. Nothing about this repo causes it, and `--ignore-scripts` does not
help — the flag that is rejected is one npm passes to itself. Verified here:
plain `npm install`, `npm install --ignore-scripts`, and
`npm_config_ignore_scripts=true npm install` all fail identically in about six
seconds.

Point npm at a scratch user config for this one command. Do **not** delete the
entry from your real `~/.npmrc` — something else put it there.

```console
$ printf 'strict-ssl=false\n' > /tmp/npmrc-clean
$ cd kotoba && npm install --no-audit --no-fund --userconfig=/tmp/npmrc-clean
```

The `strict-ssl=false` line is carried over from this machine's `~/.npmrc`
rather than shown to be necessary; drop it first and put it back only if the
install complains about certificates.

If your `~/.npmrc` has no `allow-scripts` entry, none of this applies and plain
`npm install` is the same command. This failure and this fix were first written
down in the sibling repo `cloud-itonami/flight-offer`, whose `kotoba/` package
has the same `@etzhayyim/sdk` git dependency; it reproduces here unchanged.

## 1. Install

```console
$ npm install --no-audit --no-fund --userconfig=/tmp/npmrc-clean

added 134 packages in 7m
npm warn allow-scripts 8 packages have install scripts not yet covered by allowScripts:
npm warn allow-scripts   @etzhayyim/sdk@0.1.0-alpha (prepare: tsc)
npm warn allow-scripts   @etzhayyim/atproto-client@0.1.0-alpha (prepare: tsc)
npm warn allow-scripts   @etzhayyim/base-l2@0.1.0-alpha (prepare: tsc)
npm warn allow-scripts   @etzhayyim/checkpointer@0.1.0-alpha (prepare: tsc)
npm warn allow-scripts   @etzhayyim/ipfs@0.1.0-alpha (prepare: tsc)
npm warn allow-scripts   @etzhayyim/pqh@0.1.0-alpha (prepare: tsc)
npm warn allow-scripts   @etzhayyim/witness-quorum@0.1.0-alpha (prepare: tsc)
npm warn allow-scripts   @signalapp/libsignal-client@0.94.4 (install: echo Use `npm run build` …)
```

Minutes, not seconds, is normal: npm clones seven git dependencies and runs
`tsc` inside each one. Seven minutes here with a warm npm cache and no
lockfile. A pile of `npm warn gitignore-fallback No .npmignore file found` lines
scrolls past during that; they are about the git dependencies' packaging, not
about this repo.

Two things in that warning list look like failures and are not:

- The `prepare: tsc` lines describe the **outer** tree's lifecycle scripts,
  which npm declines to run. The builds you actually need already happened
  during git-dependency preparation. Confirm rather than trust it:

  ```console
  $ ls node_modules/@etzhayyim/sdk/dist/index.js
  node_modules/@etzhayyim/sdk/dist/index.js
  ```

- `@signalapp/libsignal-client` is an optional native dependency of the SDK.
  Nothing in this package imports it.

At `e031fb5` this repo had no `.gitignore`, so finishing this step put 20,607
untracked files in `git status` and made every later step's output unreadable.
One was added in the same change that wrote this document. If your `git status`
is a wall of `node_modules`, you are on an older commit.

## 2. Run the tests

```console
$ npm test

> @etzhayyim/gtin-kotoba@0.1.0 test
> vitest run

 RUN  v4.1.10 /private/tmp/gtin-qs

 Test Files  2 passed (2)
      Tests  17 passed (17)
   Duration  436ms
```

Two seconds. If it took seven minutes, you are watching step 1 again.

There is no `typecheck` script and no `tsc` binary in `node_modules/.bin` —
`typescript` is not a dependency of this package. `vitest` strips types rather
than checking them, so **a type error will not fail this suite.** Do not read
green here as "it compiles".

The two files are not the same kind of test:

| file | what it holds |
|---|---|
| `test/gtin.test.ts` | 12 behavioural cases — register / validate / lookup / list |
| `test/readme-example.test.ts` | 5 cases asserting every value printed in `README.md` |

The second exists because the README this repo shipped with was never executed:
its usage example imported a `registerProduct` that the barrel does not export,
and called `validateGtin` and `lookupProduct` with a `{ code }` argument they do
not accept. All three claims were false at `e031fb5`. See
[ADR-0001](adr/0001-docs-state-what-was-executed.md).

## 3. Prove the suite can fail

A test suite you have only ever seen pass tells you nothing. Break one thing,
watch the right case go red, put it back. Each of these was run here.

```console
$ sed -i '' 's/"upc-12": "UPC-12",/"upc-12": "GTIN-12",/' src/registry.ts
$ npx vitest run test/readme-example.test.ts

AssertionError: expected { status: 'valid', format: 'GTIN-12' } to deeply equal { status: 'valid', format: 'UPC-12' }
 Tests  1 failed | 4 passed (5)

$ git checkout src/registry.ts
```

Two more, same shape — the mutation, the case that catches it, and nothing
else:

| break | red case | collateral |
|---|---|---|
| `formatMap["upc-12"]` → `"GTIN-12"` | `validateGtin` | none — 4 others pass |
| `lookupProduct` stops calling `normalizeGtinDigits` | `lookupProduct` | none — 4 others pass |
| `registerGtin`'s bad-checksum return → `"rejected"` | `registerGtin` | none — 4 others pass |

The third is worth doing by hand, because the behaviour it pins is a wart
rather than a feature: `registerGtin` answers a **bad check digit** with
`{ status: "alreadyExists" }`, the same status it uses for a real duplicate.
The test asserts that, so if someone fixes it the suite will say so instead of
staying quiet. See the `registerGtin` section of the README.

After restoring, confirm you are back where you started:

```console
$ npm test
 Test Files  2 passed (2)
      Tests  17 passed (17)
```

## 4. Use it from a REPL

There isn't one. `node --experimental-strip-types` cannot load this package —
`@etzhayyim/sdk-mock` ships TypeScript as its entry point and Node refuses to
strip types under `node_modules`:

```console
$ node --experimental-strip-types scratch.ts
Error [ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING]: Stripping types is
currently unsupported for files under node_modules, for
"…/node_modules/@etzhayyim/sdk-mock/src/index.ts"
```

`vitest` is the only runner this package has, so exploratory code goes in a
throwaway file under `test/` and runs with `npx vitest run test/<file>`. That
is how the README example was verified.

## 5. What you cannot do from here

- **Write to a PDS.** Every run above uses `@etzhayyim/sdk-mock`, an in-memory
  store. Nothing in this repo has been pointed at a real PDS, and there is no
  configuration in the package for doing so — you would construct `Etzhayyim`
  from `@etzhayyim/sdk` yourself with a `pdsUrl`.
- **Deploy the XRPC surface.** `xrpc-adapter/wrangler.jsonc` routes
  `gtin.etzhayyim.com/xrpc/*` and names account `4da88288…`, but its
  `workspace:*` dependency cannot resolve, so `npm install` there does not
  complete and `wrangler deploy` has never been run.
- **Look a GTIN up against GS1.** This is a record layer. A valid check digit
  means the digits are internally consistent; it does not mean the barcode was
  ever issued.
- **Register packaging hierarchies or cross-classify to CPC/UNSPSC/HS.**
  `CLAUDE.md` describes both. Neither exists.
