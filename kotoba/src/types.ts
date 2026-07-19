/**
 * gtin kotoba — record types.
 *
 * Per ADR-2605203000 Option B (PDS XRPC). GS1 Global Trade Item Number
 * registry — supports GTIN-8 / UPC-12 / EAN-13 / GTIN-14, all
 * canonicalized to 14-digit form via left zero-pad. JAN = Japanese
 * 13-digit prefix (45/49) variant of EAN.
 *
 * Identity hierarchy:
 *   did:web:gtin.etzhayyim.com                                 — controller
 *   did:web:gtin.etzhayyim.com:product:{canonicalGtin14}       — Product
 */

export const GTIN_DID_PREFIX = "did:web:gtin.etzhayyim.com:" as const;

export type CodeType =
  | "gtin-8"
  | "upc-12"
  | "ean-13"
  | "jan-13"
  | "gtin-14"
  | "invalid";

// ─── Product tier (slice 1) ─────────────────────────────────────────

export interface ProductRecord {
  did: string;
  productId: string;
  /** 14-digit canonical GTIN form (left zero-padded from any source). */
  canonicalGtin14: string;
  name: string;
  brand?: string;
  model?: string;
  /** Original code variant used at registration time. */
  originalCodeType?: CodeType;
  originalCode?: string;
  packSize?: string;
  category?: string;
  createdAt: string;
}

export interface ProductView extends ProductRecord {
  productUri: string;
}

export interface RegisterProductInput {
  productId: string;
  name: string;
  brand?: string;
  model?: string;
  /** Any of gtin / jan / upc / ean — canonicalized to gtin14. */
  gtin?: string;
  jan?: string;
  upc?: string;
  ean?: string;
  packSize?: string;
  category?: string;
}

export interface RegisterProductOutput {
  status:
    | "registered"
    | "alreadyExists"
    | "rejected"
    | "invalidChecksum";
  productId?: string;
  productDid?: string;
  canonicalGtin14?: string;
  productUri?: string;
  error?: string;
}

export interface LookupProductInput {
  /** Any of gtin / jan / upc / ean — normalized + canonicalized. */
  code?: string;
}

export interface LookupProductOutput {
  product?: ProductView;
  codeType?: CodeType;
  canonicalGtin14?: string;
  error?: string;
}

export interface ValidateGtinInput {
  code: string;
}

export interface ValidateGtinOutput {
  valid: boolean;
  codeType?: CodeType;
  normalized?: string;
  canonicalGtin14?: string;
  checkDigit?: number;
  error?: string;
}

// ─── GTIN checksum helpers ──────────────────────────────────────────

/** Strip non-digits, return digits-only string. */
export function normalizeGtinDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}

/** Detect code type from length (no checksum check yet). */
export function detectCodeType(digits: string): CodeType {
  if (digits.length === 8) return "gtin-8";
  if (digits.length === 12) return "upc-12";
  if (digits.length === 13) {
    if (digits.startsWith("45") || digits.startsWith("49")) return "jan-13";
    return "ean-13";
  }
  if (digits.length === 14) return "gtin-14";
  return "invalid";
}

/** Left zero-pad to GTIN-14 (any valid GTIN family). */
export function toGtin14(digits: string): string | undefined {
  if (digits.length < 8 || digits.length > 14) return undefined;
  return digits.padStart(14, "0");
}

/** GTIN modulo 10 check digit — works for GTIN-8/12/13/14. */
export function gtinCheckDigit(payload: string): number {
  // Process from rightmost (excluding check digit position).
  // Weights alternate 3 / 1 from the right-most payload digit.
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    const digit = Number(payload[payload.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** Validate a GTIN code (digits-only input expected). */
export function isValidGtin(digits: string): boolean {
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  if (!/^\d+$/.test(digits)) return false;
  const payload = digits.slice(0, -1);
  const checkActual = Number(digits[digits.length - 1]);
  return gtinCheckDigit(payload) === checkActual;
}

export function productDid(canonicalGtin14: string): string {
  return `${GTIN_DID_PREFIX}product:${canonicalGtin14}`;
}

export function productRkey(canonicalGtin14: string): string {
  return `product-${canonicalGtin14}`;
}
