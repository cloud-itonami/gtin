# gtin — GS1 barcode product records (etzhayyim substrate)

`gtin` records **products keyed by their GS1 barcode**. Give it a GTIN-8,
UPC-12, EAN-13, JAN-13 or GTIN-14; it validates the check digit, canonicalises
the code to 14 digits by left zero-padding, and writes one product record per
canonical code into an AT Protocol PDS collection. Lookup accepts any of those
five forms — the same physical product found by its UPC in the US and its EAN
in Europe resolves to one record.

GTIN is the **G**lobal **T**rade **I**tem **N**umber, the number under the
barcode on a retail item. GS1 is the standards body that issues company
prefixes; a GTIN is a company prefix plus an item reference plus a modulo-10
check digit.

- **Identity**: `did:web:gtin.etzhayyim.com`, nanoid `gt1n4k7m`
- **Per-product DID**: `did:web:gtin.etzhayyim.com:product:{canonicalGtin14}`
- **Collection**: `com.etzhayyim.gtin.product`
- **Substrate**: ADR-2605203000 Option B — PDS XRPC writes via
  `@etzhayyim/sdk` `e.write()`. No SQL, no vendor database.

It is a **record layer, not a product database**. It stores what you tell it.
It does not look GTINs up against GS1's registry, does not resolve a company
prefix to its owner, and does not know whether a barcode you hand it was ever
issued to anyone. A valid check digit means the digits are internally
consistent — nothing more.

## Read this before `AGENTS.md`: it is a design document, not a status report

`AGENTS.md` describes a considerably larger system than the one in this repo —
five collections, six commands, a packaging hierarchy, CPC/UNSPSC/HS Code
cross-classification, per-GS1-prefix owner DIDs, three WIT capability exports,
and a 60-second heartbeat emitting coverage reports. **One collection and five
functions exist.** Nothing else on that list is implemented anywhere in this
repository, and no heartbeat runs.

| `AGENTS.md` says | actually here |
|---|---|
| collections `product`, `packaging`, `classification`, `gs1_prefix`, `coverage_report` | `product` only |
| commands `register-product`, `get-product`, `search-products`, `validate-gtin`, `list-by-prefix`, `register-packaging` | `registerGtin`, `lookupProduct`, `validateGtin`, `listProducts` |
| WIT exports `product-registry`, `packaging-hierarchy`, `cross-classification` | no `.wit` file in the repo |
| `did:web:gtin.etzhayyim.com:{gs1_prefix}` per prefix owner | only `…:product:{gtin14}` |
| 60s heartbeat → coverage metrics → ATPost | no scheduler, no cron, no heartbeat code |

That is not a criticism of `AGENTS.md` — it is the design the app was specified
against, and it came across verbatim when the code was extracted from
`etzhayyim/root`. It is a criticism of reading it as an inventory. See
[ADR-0001](docs/adr/0001-docs-state-what-was-executed.md).

`README.edn` still identifies this repo as `com-etzhayyim-app-gtin`, its name
before it moved to `cloud-itonami/gtin`. Left as-is deliberately: it is the
migration record, and `migration.edn` names the same destination.

## What is actually here

```
kotoba/          the substrate of record — 3 source files, 2 test files
xrpc-adapter/    a scaffold: a wrangler config and a stub. Not deployable.
```

`kotoba/` installs and its tests pass. See
[`docs/operator-quickstart.md`](docs/operator-quickstart.md), which was walked
end to end on 2026-08-13 rather than transcribed from `package.json`.

`xrpc-adapter/` is one line of README (`Scaffold. See ADR-2605210000.`) plus a
`wrangler.jsonc` pointing at `gtin.etzhayyim.com/xrpc/*`. Its `package.json`
depends on `@etzhayyim/gtin-kotoba` at `workspace:*` and the extraction left the
workspace behind, so there is nothing for that spec to resolve against. Do not
start there.

## API

Every value below is asserted by `kotoba/test/readme-example.test.ts`, which
exists so this section cannot drift silently. If you change a documented
behaviour, that test goes red and you update both together.

```ts
import { MockEtzhayyim } from "@etzhayyim/sdk-mock";   // or Etzhayyim from @etzhayyim/sdk
import {
  registerGtin, lookupProduct, validateGtin, listProducts,
} from "@etzhayyim/gtin-kotoba";

const e = new MockEtzhayyim({ did: "did:web:gtin.etzhayyim.com" });
```

### `validateGtin(e, { gtin })` — check digit only, writes nothing

```ts
await validateGtin(e, { gtin: "5901234123457" });  // { status: "valid", format: "GTIN-13" }
await validateGtin(e, { gtin: "012345678905" });   // { status: "valid", format: "UPC-12" }
await validateGtin(e, { gtin: "4901020203104" });  // { status: "valid", format: "GTIN-13" }
await validateGtin(e, { gtin: "5901234123456" });  // { status: "rejected", error: "invalidChecksum" }
await validateGtin(e, { gtin: "invalid-gtin" });   // { status: "rejected", error: "invalidFormat" }
```

The `e` argument is ignored — validation is pure arithmetic. It is in the
signature so every command in this package has the same shape.

A JAN-13 (the Japanese EAN variant, prefix 45 or 49) reports `format:
"GTIN-13"`, not `"JAN-13"`: `detectCodeType` distinguishes them but
`validateGtin` folds both onto the GS1 name for the 13-digit form. `jan-13` is
still what gets stored in the record's `originalCodeType`.

### `registerGtin(e, { gtin, productName, manufacturer })`

```ts
await registerGtin(e, { gtin: "5901234123457", productName: "Chocolate Bar", manufacturer: "Acme Corp" });
// { status: "registered", productUri: "at://did:web:gtin.etzhayyim.com/com.etzhayyim.gtin.product/product-05901234123457" }

// same GTIN again — idempotent on the canonical code, not on the name
await registerGtin(e, { gtin: "5901234123457", productName: "Chocolate Bar", manufacturer: "Acme Corp" });
// { status: "alreadyExists", productUri: "at://…" }
```

That `at://` URI is what `@etzhayyim/sdk-mock` returns — `at://{did}/{collection}/{rkey}`,
with `rkey` = `product-{canonicalGtin14}`. Against a real PDS the shape is the
same, but nothing in this repo has been run against one, so treat the exact
string as measured-under-mock.

Idempotency is keyed on `canonicalGtin14` alone. Registering the same barcode
with a different `productName` returns `alreadyExists` and **does not update**
the stored name. There is no update path.

**A bad check digit also returns `alreadyExists`, with no `productUri`:**

```ts
await registerGtin(e, { gtin: "5901234123456", productName: "Fake Bar", manufacturer: "Acme Corp" });
// { status: "alreadyExists" }     ← nothing was written; the code was rejected
```

This is a wart, documented because it will bite you: a caller that branches on
`status !== "registered"` treats a rejected barcode as a duplicate and moves
on. The distinguishing signal is `productUri` — present on a real duplicate,
absent on a rejection. `registry.ts` contains a `registerProduct` that returns
a proper `{ status: "invalidChecksum" }` and carries brand, model, pack size
and category, but it is **not exported from `src/index.ts`** and so cannot be
imported from this package. Fixing that is a substrate change, out of scope for
the change that wrote this README; the behaviour is pinned by a test so the
fix will announce itself.

### `lookupProduct(e, { gtin })` — accepts any GTIN family, any separators

```ts
await lookupProduct(e, { gtin: "590-1234-123-457" });
// { product: { did: "did:web:gtin.etzhayyim.com:product:05901234123457",
//              canonicalGtin14: "05901234123457",
//              productName: "Chocolate Bar", manufacturer: "Acme Corp", … } }

await lookupProduct(e, { gtin: "9999999999999" });   // { error: "notFound" }
```

Non-digits are stripped before lookup, so hyphenated and spaced forms work. A
GTIN that fails its check digit returns `notFound` rather than a validation
error — lookup does not distinguish "no such product" from "not a barcode".

The returned view carries both spellings of two fields: `name`/`productName`
and `brand`/`manufacturer`. The first of each is what is stored; the second is
the alias the view adds.

### `listProducts(e, { manufacturer? })`

```ts
(await listProducts(e, {})).items.length;                        // every product
(await listProducts(e, { manufacturer: "Acme Corp" })).items;    // exact-match filter
```

The filter is an exact string comparison on `manufacturer`, applied in memory
after reading the whole collection. There is no pagination and no index.

### Pure helpers

Exported for callers that need the arithmetic without an SDK instance:
`normalizeGtinDigits`, `detectCodeType`, `isValidGtin`, `toGtin14`,
`gtinCheckDigit`, `productDid`, `productRkey`, `GTIN_DID_PREFIX`.

```ts
normalizeGtinDigits("590-1234-123-457");  // "5901234123457"
detectCodeType("4901020203104");          // "jan-13"   (13 digits, prefix 49)
detectCodeType("5901234123457");          // "ean-13"
isValidGtin("5901234123457");             // true
toGtin14("5901234123457");                // "05901234123457"
productDid("05901234123457");             // "did:web:gtin.etzhayyim.com:product:05901234123457"
```

## Canonicalisation

All families left zero-pad to 14 digits, which is the storage form and the DID
suffix:

| source | length | example | stored as |
|---|---|---|---|
| GTIN-8 | 8 | `01234565` | `00000001234565` |
| UPC-12 | 12 | `012345678905` | `00012345678905` |
| EAN-13 | 13 | `5901234123457` | `05901234123457` |
| JAN-13 | 13 | `4901020203104` | `04901020203104` |
| GTIN-14 | 14 | `19012345678901` | `19012345678901` |

The check digit is modulo 10 with weights alternating 3 and 1 from the
rightmost payload digit. `isValidGtin` applies it to all four lengths.

## Status

The record layer runs; nothing is deployed. `kotoba/` installs, and 17 tests
pass across two files (12 behavioural, 5 pinning this README). What that green
run does **not** mean: no PDS has been written to, `gtin.etzhayyim.com` serves
nothing, the `xrpc-adapter` Worker has never been built, and no GTIN in any
example here corresponds to a real product — `5901234123457` and `012345678905`
are the check-digit examples GS1 uses in its own documentation.
