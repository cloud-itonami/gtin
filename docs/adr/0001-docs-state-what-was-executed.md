# ADR-0001 — Documentation in this repo states what was executed

- **Status**: accepted
- **Date**: 2026-08-13
- **Applies to**: `README.md`, `docs/operator-quickstart.md`, and any future
  usage example in `cloud-itonami/gtin`
- **Commit measured**: `e031fb5`

## Context

At `e031fb5` this repo had no root `README.md`. The two documents a reader
would reach for instead both described a system that is not here.

`AGENTS.md` specifies five collections, six commands, a packaging hierarchy,
CPC/UNSPSC/HS Code cross-classification, per-GS1-prefix owner DIDs, three WIT
capability exports, and a 60-second heartbeat emitting coverage reports. One
collection and five functions exist. There is no `.wit` file, no scheduler, and
no packaging or classification code anywhere in the tree. `AGENTS.md` is the
design the app was specified against, and it came across verbatim when the code
was extracted from `etzhayyim/root`. Nothing is wrong with it as a design
document. It is wrong as an inventory, and it is the first file in the repo.

`kotoba/README.md` carries a worked usage example. Executed at `e031fb5`, every
claim in it is false:

| the example says | executing it gives |
|---|---|
| `import { registerProduct } from "@etzhayyim/gtin-kotoba"` | `registerProduct` is not exported from `src/index.ts` — the import fails |
| `validateGtin(e, { code: "4901020203104" })` → `{ valid: true, codeType: "jan-13", canonicalGtin14: "04901020203104", checkDigit: 4 }` | `{ status: "rejected", error: "missingCode" }` — the parameter is `gtin`, and the return has neither `valid` nor `canonicalGtin14` |
| `lookupProduct(e, { code: "490-1020-203-104" })` → the product | `{ error: "notFound" }` — same parameter mismatch |

The shapes in that example are not invented; they are the interfaces in
`src/types.ts` (`ValidateGtinInput.code`, `ValidateGtinOutput.valid`). The
implementation in `src/registry.ts` diverged from those interfaces, the example
was written against the types, and nobody ran it. `registerProduct` — the one
function that does implement the `types.ts` contract, returns a real
`invalidChecksum` status, and carries brand, model, pack size and category — is
defined but left out of the barrel, so it is unreachable from outside the
package.

This is the failure mode where **a documented example that was never run is
indistinguishable from one that passes**: both are prose in a fenced block. The
reader cannot tell them apart, and neither can any check that exists today.

## Decision

Documentation in this repo states what was executed.

1. **Every value printed in a usage example is asserted by a test.**
   `kotoba/test/readme-example.test.ts` holds the assertions for `README.md`.
   Changing a documented behaviour turns that suite red, so the code and the
   prose move together or not at all.
2. **The quickstart is walked, not transcribed from `package.json`.**
   `docs/operator-quickstart.md` records commands that were run, their real
   output, and their real durations — including the install failure this
   machine's `~/.npmrc` causes and the way around it.
3. **Where a document describes something unbuilt, it says so at the top**,
   with a table of specified-versus-present. `README.md` does this for
   `AGENTS.md`.
4. **Warts get documented as warts, and pinned by a test.** `registerGtin`
   answers a bad check digit with `{ status: "alreadyExists" }` — the same
   status as a real duplicate, distinguishable only by the absent `productUri`.
   The test asserts the current behaviour so that fixing it is loud rather than
   silent.
5. **`kotoba/README.md`'s usage example is replaced by a pointer to the root
   `README.md`** rather than corrected in place, so there is one API section to
   keep true instead of two.

## What this decision explicitly does not do

It does not fix the code. `registerProduct` stays unexported, `registerGtin`
keeps conflating rejection with duplication, and the `types.ts` interfaces stay
out of step with `registry.ts`. Those are substrate changes; this ADR is about
what the documents are allowed to claim. Each of them is now pinned by a test,
which is the cheapest way to make sure the fix is noticed when it lands.

It does not touch `AGENTS.md`, `README.edn`, or `migration.edn`. The first is
the design of record for a system nobody has withdrawn; the other two are the
migration record, and `README.edn` naming this repo `com-etzhayyim-app-gtin` is
a true statement about where it came from.

## Consequences

- A reader who runs the README gets what the README says. That was not true
  before, and no check would have caught it.
- The API section has a maintenance cost: change a return value and a test goes
  red. That cost is the point.
- The test suite is now 17 cases in two files with different jobs — 12
  behavioural, 5 documentary. Someone adding behavioural cases should add them
  to `test/gtin.test.ts`; `test/readme-example.test.ts` should only ever contain
  what `README.md` prints.
- `vitest` strips types rather than checking them and this package has no
  `typecheck` script, so none of the above catches a type error. The gap
  between `types.ts` and `registry.ts` that produced the false example is still
  unguarded by anything except the documentary tests.
