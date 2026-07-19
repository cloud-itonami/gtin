/**
 * gtin kotoba — barrel.
 *
 * Per ADR-2605203000 Option B Phase E reference impl. GS1 Global Trade
 * Item Number registry — supports GTIN-8 / UPC-12 / EAN-13 / JAN-13 /
 * GTIN-14, all canonicalized to GTIN-14 for storage.
 *
 * Slice 1: 3 commands ported (covering all 4 canonical lexicons:
 * product.json record + registerProduct/lookupProduct/validateGtin
 * procedures).
 */

export * from "./types.js";
export {
  registerGtin,
  lookupProduct,
  validateGtin,
  listProducts,
  gtinCheckDigit,
} from "./registry.js";
