# gtin.etzhayyim.com — GTIN Product Identification

## Identity

| key | value |
|---|---|
| domain | gtin.etzhayyim.com |
| performerType | service |
| nanoid | gt1n4k7m |
| primary DID | `did:web:gtin.etzhayyim.com` |
| NSID prefix | `com.etzhayyim.gtin.*` |

## What This App Does

GS1 Global Trade Item Number (GTIN) registry。世界中のバーコード製品を DID 化し、CPC/UNSPSC/HS Code と cross-classification。

- GTIN-8 / GTIN-12 (UPC-A) / GTIN-13 (EAN) / GTIN-14 を統一管理
- GS1 Company Prefix → path-based DID per prefix owner
- Check digit validation (modulo 10)
- Product master data + packaging hierarchy

## Multi-DID Model

| DID | 用途 |
|---|---|
| `did:web:gtin.etzhayyim.com` | App coordinator |
| `did:web:gtin.etzhayyim.com:{gs1_prefix}` | GS1 Company Prefix owner (manufacturer) |

## Data Collections

| collection | NSID | 内容 |
|---|---|---|
| product | `com.etzhayyim.gtin.product` | GTIN master (barcode, name, brand, manufacturer) |
| packaging | `com.etzhayyim.gtin.packaging` | Packaging hierarchy (inner/case/pallet) |
| classification | `com.etzhayyim.gtin.classification` | CPC/UNSPSC/HS Code mapping |
| gs1_prefix | `com.etzhayyim.gtin.gs1_prefix` | GS1 Company Prefix registry |
| coverage_report | `com.etzhayyim.gtin.coverage_report` | Coverage metrics per prefix |

## WIT Capability Exports

| interface | 機能 |
|---|---|
| `product-registry` | GTIN lookup, search, register, validate |
| `packaging-hierarchy` | packaging levels, trade item grouping |
| `cross-classification` | CPC/UNSPSC/HS Code concordance |

## Heartbeat (Shinka)

60s heartbeat → coverage metrics per GS1 prefix → weakest prefix → ATPost coverage report

## Commands

| command | 説明 |
|---|---|
| `register-product` | GTIN + product master 登録 |
| `get-product` | GTIN で製品検索 |
| `search-products` | 名前・ブランドで検索 |
| `validate-gtin` | Check digit validation |
| `list-by-prefix` | GS1 prefix で一覧 |
| `register-packaging` | Packaging hierarchy 登録 |
| `get-classifications` | CPC/UNSPSC/HS Code mapping |
| `get-coverage` | Prefix coverage metrics |
