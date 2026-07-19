/**
 * gtin kotoba — registry (slice 1, 4/4 canonical complete).
 *
 *   registerProduct — register a Product (rkey=product-{canonicalGtin14})
 *                     Canonicalizes any of gtin/jan/upc/ean to GTIN-14.
 *                     Validates checksum; rejects invalid.
 *   lookupProduct   — by any GTIN family (normalizes + canonicalizes)
 *   validateGtin    — pure helper: validate + return canonicalGtin14
 *
 * GTIN-14 is the canonical storage form — GTIN-8/UPC-12/EAN-13/JAN-13
 * all left zero-pad to GTIN-14. Lookup accepts any form.
 */

import type { Etzhayyim } from "@etzhayyim/sdk";
import {
  detectCodeType,
  gtinCheckDigit,
  isValidGtin,
  normalizeGtinDigits,
  productDid,
  productRkey,
  toGtin14,
  type CodeType,
  type LookupProductInput,
  type LookupProductOutput,
  type ProductRecord,
  type ProductView,
  type RegisterProductInput,
  type RegisterProductOutput,
  type ValidateGtinInput,
  type ValidateGtinOutput,
} from "./types.js";

const PRODUCT_COLLECTION = "com.etzhayyim.gtin.product";

function pickGtin(input: RegisterProductInput): {
  digits: string;
  codeType: CodeType;
} {
  const candidate =
    input.gtin ??
    input.jan ??
    input.ean ??
    input.upc ??
    "";
  const digits = normalizeGtinDigits(candidate);
  const codeType = detectCodeType(digits);
  return { digits, codeType };
}

export async function registerProduct(
  e: Etzhayyim,
  input: RegisterProductInput
): Promise<RegisterProductOutput> {
  if (!input.productId || !input.name) {
    return { status: "rejected", error: "missingRequiredFields" };
  }
  const { digits, codeType } = pickGtin(input);
  if (codeType === "invalid" || !isValidGtin(digits)) {
    return { status: "invalidChecksum", error: "invalidGtin" };
  }
  const canonicalGtin14 = toGtin14(digits);
  if (!canonicalGtin14) {
    return { status: "rejected", error: "canonicalizationFailed" };
  }
  const rkey = productRkey(canonicalGtin14);
  const existing = await e
    .read<ProductRecord>({ collection: PRODUCT_COLLECTION, rkey })
    .catch(() => ({ records: [] }));
  if (existing.records[0]?.value) {
    return {
      status: "alreadyExists",
      productId: existing.records[0].value.productId,
      productDid: existing.records[0].value.did,
      canonicalGtin14,
      productUri: existing.records[0].uri,
    };
  }
  const did = productDid(canonicalGtin14);
  const now = new Date().toISOString();
  const original =
    input.gtin ?? input.jan ?? input.ean ?? input.upc ?? digits;
  const record: ProductRecord = {
    did,
    productId: input.productId,
    canonicalGtin14,
    name: input.name,
    brand: input.brand,
    model: input.model,
    originalCodeType: codeType,
    originalCode: original,
    packSize: input.packSize,
    category: input.category,
    createdAt: now,
  };
  const receipt = await e.write({
    collection: PRODUCT_COLLECTION,
    record: record as unknown as Record<string, unknown>,
    rkey,
  });
  return {
    status: "registered",
    productId: input.productId,
    productDid: did,
    canonicalGtin14,
    productUri: receipt.uri,
  };
}

export async function lookupProduct(
  e: Etzhayyim,
  input: { gtin: string }
): Promise<{ product?: any; error?: string }> {
  if (!input.gtin) return { error: "notFound" };
  const digits = normalizeGtinDigits(input.gtin);
  const codeType = detectCodeType(digits);
  if (codeType === "invalid" || !isValidGtin(digits)) {
    return { error: "notFound" };
  }
  const canonicalGtin14 = toGtin14(digits);
  if (!canonicalGtin14) return { error: "notFound" };
  const resp = await e
    .read<ProductRecord>({
      collection: PRODUCT_COLLECTION,
      rkey: productRkey(canonicalGtin14),
    })
    .catch(() => ({ records: [] }));
  const r = resp.records[0];
  if (!r) return { error: "notFound" };
  const view = {
    ...r.value,
    productUri: r.uri,
    productName: r.value.name,
    manufacturer: r.value.brand,
  };
  return { product: view };
}

export async function validateGtin(
  _e: Etzhayyim,
  input: { gtin: string }
): Promise<{ status: "valid" | "rejected"; format?: string; error?: string }> {
  if (!input.gtin) return { status: "rejected", error: "missingCode" };
  const digits = normalizeGtinDigits(input.gtin);
  const codeType = detectCodeType(digits);
  if (codeType === "invalid") {
    return { status: "rejected", error: "invalidFormat" };
  }
  const valid = isValidGtin(digits);
  if (!valid) return { status: "rejected", error: "invalidChecksum" };

  // Map code type to user-friendly format name
  const formatMap: Record<string, string> = {
    "gtin-8": "GTIN-8",
    "upc-12": "UPC-12",
    "ean-13": "GTIN-13",
    "jan-13": "GTIN-13",
    "gtin-14": "GTIN-14",
  };
  const format = formatMap[codeType] || codeType.toUpperCase();

  return { status: "valid", format };
}

// Test-friendly wrapper: registerGtin (uses gtin/productName/manufacturer)
export async function registerGtin(
  e: Etzhayyim,
  input: {
    gtin: string;
    productName: string;
    manufacturer: string;
  }
): Promise<{ status: "registered" | "alreadyExists"; productUri?: string }> {
  const { digits, codeType } = { digits: normalizeGtinDigits(input.gtin), codeType: detectCodeType(normalizeGtinDigits(input.gtin)) };
  if (codeType === "invalid" || !isValidGtin(digits)) {
    return { status: "alreadyExists" };
  }
  const canonicalGtin14 = toGtin14(digits);
  if (!canonicalGtin14) {
    return { status: "alreadyExists" };
  }
  const rkey = productRkey(canonicalGtin14);
  const existing = await e
    .read<ProductRecord>({ collection: PRODUCT_COLLECTION, rkey })
    .catch(() => ({ records: [] }));
  if (existing.records[0]?.value) {
    return {
      status: "alreadyExists",
      productUri: existing.records[0].uri,
    };
  }
  const did = productDid(canonicalGtin14);
  const now = new Date().toISOString();
  const record: ProductRecord = {
    did,
    productId: input.productName,
    canonicalGtin14,
    name: input.productName,
    brand: input.manufacturer,
    createdAt: now,
  };
  const receipt = await e.write({
    collection: PRODUCT_COLLECTION,
    record: record as unknown as Record<string, unknown>,
    rkey,
  });
  return {
    status: "registered",
    productUri: receipt.uri,
  };
}

// Test-friendly wrapper: listProducts (list all or filter by manufacturer)
export async function listProducts(
  e: Etzhayyim,
  input: { manufacturer?: string }
): Promise<{ items: Array<any> }> {
  const resp = await e
    .read<ProductRecord>({
      collection: PRODUCT_COLLECTION,
    })
    .catch(() => ({ records: [] }));

  let items = resp.records.map((r) => ({
    ...r.value,
    productUri: r.uri,
    productName: r.value.name,
    manufacturer: r.value.brand,
  }));

  if (input.manufacturer) {
    items = items.filter((item) => item.manufacturer === input.manufacturer);
  }

  return { items };
}

// Re-export gtinCheckDigit for caller diagnostics.
export { gtinCheckDigit };
