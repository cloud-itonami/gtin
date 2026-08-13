/**
 * Every value printed in the repo root `README.md` API section, asserted.
 *
 * This file exists because the example this repo shipped with had never been
 * executed: it imported a `registerProduct` the barrel does not export, and
 * called `validateGtin` / `lookupProduct` with a `{ code }` argument they do
 * not accept. All three claims were false at e031fb5. See
 * docs/adr/0001-docs-state-what-was-executed.md.
 *
 * Scope rule: this file holds only what README.md prints. Behavioural cases
 * belong in gtin.test.ts. If you change a documented return value, this suite
 * goes red — update the README in the same commit.
 *
 * Two assertions here pin warts rather than features, deliberately, so that
 * fixing them is loud:
 *   - registerGtin answers a BAD CHECK DIGIT with { status: "alreadyExists" },
 *     the same status as a real duplicate, distinguishable only by the absent
 *     productUri.
 *   - validateGtin reports a JAN-13 as format "GTIN-13", though detectCodeType
 *     distinguishes jan-13 from ean-13.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MockEtzhayyim } from "@etzhayyim/sdk-mock";
import {
  registerGtin, lookupProduct, validateGtin, listProducts,
  detectCodeType, isValidGtin, normalizeGtinDigits, toGtin14, productDid,
} from "../src/index.js";

describe("README example", () => {
  let e: any;
  beforeEach(() => { e = new MockEtzhayyim({ did: "did:web:gtin.etzhayyim.com" }); });

  it("validateGtin", async () => {
    expect(await validateGtin(e, { gtin: "5901234123457" })).toEqual({ status: "valid", format: "GTIN-13" });
    expect(await validateGtin(e, { gtin: "012345678905" })).toEqual({ status: "valid", format: "UPC-12" });
    expect(await validateGtin(e, { gtin: "4901020203104" })).toEqual({ status: "valid", format: "GTIN-13" });
    expect(await validateGtin(e, { gtin: "5901234123456" })).toEqual({ status: "rejected", error: "invalidChecksum" });
    expect(await validateGtin(e, { gtin: "invalid-gtin" })).toEqual({ status: "rejected", error: "invalidFormat" });
  });

  it("registerGtin", async () => {
    const input = { gtin: "5901234123457", productName: "Chocolate Bar", manufacturer: "Acme Corp" };
    const first = await registerGtin(e, input);
    expect(first.status).toBe("registered");
    expect(first.productUri).toMatch(/^at:\/\//);
    expect((await registerGtin(e, input)).status).toBe("alreadyExists");
    expect(await registerGtin(e, { ...input, gtin: "5901234123456" })).toEqual({ status: "alreadyExists" });
  });

  it("lookupProduct", async () => {
    await registerGtin(e, { gtin: "5901234123457", productName: "Chocolate Bar", manufacturer: "Acme Corp" });
    const hit: any = await lookupProduct(e, { gtin: "590-1234-123-457" });
    expect(hit.product.productName).toBe("Chocolate Bar");
    expect(hit.product.manufacturer).toBe("Acme Corp");
    expect(hit.product.canonicalGtin14).toBe("05901234123457");
    expect(hit.product.did).toBe("did:web:gtin.etzhayyim.com:product:05901234123457");
    expect(await lookupProduct(e, { gtin: "9999999999999" })).toEqual({ error: "notFound" });
  });

  it("listProducts", async () => {
    await registerGtin(e, { gtin: "5901234123457", productName: "Chocolate Bar", manufacturer: "Acme Corp" });
    await registerGtin(e, { gtin: "012345678905", productName: "Widget", manufacturer: "Widget Inc" });
    expect((await listProducts(e, {})).items.length).toBe(2);
    expect((await listProducts(e, { manufacturer: "Acme Corp" })).items.map((p: any) => p.productName)).toEqual(["Chocolate Bar"]);
  });

  it("pure helpers", () => {
    expect(normalizeGtinDigits("590-1234-123-457")).toBe("5901234123457");
    expect(detectCodeType("4901020203104")).toBe("jan-13");
    expect(detectCodeType("5901234123457")).toBe("ean-13");
    expect(isValidGtin("5901234123457")).toBe(true);
    expect(toGtin14("5901234123457")).toBe("05901234123457");
    expect(productDid("05901234123457")).toBe("did:web:gtin.etzhayyim.com:product:05901234123457");
  });
});
