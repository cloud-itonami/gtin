# gtin kotoba

Phase E Option B reference implementation of gtin (GS1 Global Trade Item Number registry) on the etzhayyim substrate.

Per ADR-2605203000, gtin migrates from vendor's `createKyselyDb` pattern to
**Option B** — PDS XRPC writes via `@etzhayyim/sdk e.write()`. (That ADR lives
in `etzhayyim/root` under `90-docs/adr/`; the relative link that used to be here
pointed three levels above this repo's root and resolved to nothing after the
extraction.)

Coverage: **3 of 3 (100%) canonical** gtin procedures ported (covering 4 vendor lexicons: product record + 3 procedures).

| Tier | Commands | Slice |
|---|---|---|
| Product Registry | registerProduct, lookupProduct, validateGtin | **1** |

⚠ Of those three, only `lookupProduct` and `validateGtin` are exported from
`src/index.ts`. `registerProduct` is not; the reachable registration entry point
is `registerGtin`, which is not in this table. The barrel also exports
`listProducts`.

## Canonicalization to GTIN-14

All GTIN family codes are left zero-padded to 14 digits for storage:

| Source | Length | Example |
|---|---|---|
| GTIN-8 | 8 | `01234565` → `00000001234565` |
| UPC-12 | 12 | `012345678905` → `00012345678905` |
| EAN-13 | 13 | `4006381333931` → `04006381333931` |
| JAN-13 | 13 | `4901020203104` → `04901020203104` (JAN = 45/49 prefix EAN) |
| GTIN-14 | 14 | `19012345678901` → `19012345678901` |

## Authority-chain DIDs

```
did:web:gtin.etzhayyim.com:product:{canonicalGtin14}
```

## Check-digit validation

GTIN modulo 10 with alternating weights 3/1 from the right (excluding check digit). `isValidGtin` works for all GTIN-8/12/13/14 variants. `lookupProduct` accepts any GTIN family and converts before lookup.

`registerProduct` — which does return a proper `invalidChecksum` — is defined in
`src/registry.ts` but **not exported from `src/index.ts`**, so it cannot be
imported from this package. The reachable entry point is `registerGtin`, and it
answers a bad check digit with `{ status: "alreadyExists" }`.

## Usage

**See the [repo root `README.md`](../README.md#api).** It is the one API
section, and every value it prints is asserted by
[`test/readme-example.test.ts`](test/readme-example.test.ts).

The example that used to be here was never executed. It imported a
`registerProduct` the barrel does not export and passed `{ code: … }` to
`validateGtin` and `lookupProduct`, which take `{ gtin: … }` — so all three of
its calls failed. The shapes it used are the interfaces in `src/types.ts`;
`src/registry.ts` diverged from them. See
[ADR-0001](../docs/adr/0001-docs-state-what-was-executed.md).

## Sibling reference impls (13 actors)

| Actor | Coverage | Status |
|---|---|---|
| hanrei | 31/31 | complete |
| ipaddress | 37/37 | complete |
| sbom | 17/N (canonical 4/4) | canonical complete |
| kiyo | 12/12 | complete |
| ki | 4/4 | complete |
| otakiage | 13 (10/10 canonical) | complete |
| houki | 9 (8/8 canonical) | complete |
| open-banking | 5/5 | complete |
| open-denki | 12/12 | complete |
| koke | 4/4 | complete |
| hakkou | 3 (2/2 canonical) | complete |
| isbn | 4/4 | complete |
| **gtin** | **3/3** | **complete** |
