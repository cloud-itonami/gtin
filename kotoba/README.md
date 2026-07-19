# gtin kotoba

Phase E Option B reference implementation of gtin (GS1 Global Trade Item Number registry) on the etzhayyim substrate.

Per [ADR-2605203000](../../../90-docs/adr/2605203000-kotoba-write-target-options.md), gtin migrates from vendor's `createKyselyDb` pattern to **Option B** — PDS XRPC writes via `@etzhayyim/sdk e.write()`.

Coverage: **3 of 3 (100%) canonical** gtin procedures ported (covering 4 vendor lexicons: product record + 3 procedures).

| Tier | Commands | Slice |
|---|---|---|
| Product Registry | registerProduct, lookupProduct, validateGtin | **1** |

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

GTIN modulo 10 with alternating weights 3/1 from the right (excluding check digit). `isValidGtin` works for all GTIN-8/12/13/14 variants. `registerProduct` rejects with `invalidChecksum` on bad input. `lookupProduct` accepts any GTIN family and converts before lookup.

## Usage

```ts
import { Etzhayyim } from "@etzhayyim/sdk";
import { registerProduct, lookupProduct, validateGtin } from "@etzhayyim/gtin-kotoba";

const e = new Etzhayyim({
  did: "did:web:gtin.etzhayyim.com",
  pdsUrl: "https://pds.etzhayyim.com",
  l2RpcUrl: "https://mainnet.base.org",
});

// Validate without persistence
const v = await validateGtin(e, { code: "4901020203104" });
// → { valid: true, codeType: "jan-13", normalized: "4901020203104",
//     canonicalGtin14: "04901020203104", checkDigit: 4 }

// Register
const r = await registerProduct(e, {
  productId: "uchu-no-genri-2026",
  name: "宇宙のげんり",
  brand: "Coca-Cola",
  model: "350ml-can",
  jan: "4901020203104",  // any of gtin/jan/upc/ean accepted
  packSize: "350ml",
  category: "beverages",
});
// → { status: "registered", canonicalGtin14: "04901020203104", productDid: "..." }

// Lookup by any GTIN family
const found = await lookupProduct(e, { code: "490-1020-203-104" });
```

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
