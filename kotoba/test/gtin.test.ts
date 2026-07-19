import { describe, it, expect, beforeEach } from "vitest";
import { MockEtzhayyim } from "@etzhayyim/sdk-mock";
import {
  registerGtin,
  validateGtin,
  lookupProduct,
  listProducts,
} from "../src/index.js";

describe("gtin kotoba", () => {
  let e: any;

  beforeEach(() => {
    e = new MockEtzhayyim({ did: "did:web:gtin.etzhayyim.com" });
  });

  describe("registerGtin", () => {
    it("registers a product with valid GTIN-13", async () => {
      const result = await registerGtin(e, {
        gtin: "5901234123457",
        productName: "Chocolate Bar",
        manufacturer: "Acme Corp",
      });

      expect(result.status).toBe("registered");
      expect(result.productUri).toBeDefined();
    });

    it("registers a product with valid UPC-12", async () => {
      const result = await registerGtin(e, {
        gtin: "012345678905",
        productName: "Widget",
        manufacturer: "Widget Inc",
      });

      expect(result.status).toBe("registered");
      expect(result.productUri).toBeDefined();
    });

    it("is idempotent on gtin", async () => {
      const input = {
        gtin: "5901234123457",
        productName: "Chocolate Bar",
        manufacturer: "Acme Corp",
      };

      const first = await registerGtin(e, input);
      expect(first.status).toBe("registered");

      const second = await registerGtin(e, input);
      expect(second.status).toBe("alreadyExists");
    });
  });

  describe("validateGtin", () => {
    it("accepts valid GTIN-13", async () => {
      const result = await validateGtin(e, { gtin: "5901234123457" });

      expect(result.status).toBe("valid");
      expect(result.format).toBe("GTIN-13");
    });

    it("accepts valid UPC-12", async () => {
      const result = await validateGtin(e, { gtin: "012345678905" });

      expect(result.status).toBe("valid");
      expect(result.format).toBe("UPC-12");
    });

    it("rejects invalid checksum", async () => {
      const result = await validateGtin(e, { gtin: "5901234123456" });

      expect(result.status).toBe("rejected");
      expect(result.error).toBe("invalidChecksum");
    });

    it("rejects malformed GTIN", async () => {
      const result = await validateGtin(e, { gtin: "invalid-gtin" });

      expect(result.status).toBe("rejected");
      expect(result.error).toBe("invalidFormat");
    });
  });

  describe("lookupProduct", () => {
    beforeEach(async () => {
      await registerGtin(e, {
        gtin: "5901234123457",
        productName: "Chocolate Bar",
        manufacturer: "Acme Corp",
      });
    });

    it("looks up product by EAN-13", async () => {
      const result = await lookupProduct(e, { gtin: "5901234123457" });

      expect(result.product).toBeDefined();
      expect(result.product?.productName).toBe("Chocolate Bar");
      expect(result.product?.manufacturer).toBe("Acme Corp");
    });

    it("looks up product by UPC-12", async () => {
      await registerGtin(e, {
        gtin: "012345678905",
        productName: "Widget",
        manufacturer: "Widget Inc",
      });

      const result = await lookupProduct(e, { gtin: "012345678905" });

      expect(result.product).toBeDefined();
      expect(result.product?.productName).toBe("Widget");
    });

    it("returns notFound for unregistered gtin", async () => {
      const result = await lookupProduct(e, {
        gtin: "9999999999999",
      });

      expect(result.error).toBe("notFound");
      expect(result.product).toBeUndefined();
    });
  });

  describe("listProducts", () => {
    beforeEach(async () => {
      await registerGtin(e, {
        gtin: "5901234123457",
        productName: "Chocolate Bar",
        manufacturer: "Acme Corp",
      });
      await registerGtin(e, {
        gtin: "012345678905",
        productName: "Widget",
        manufacturer: "Widget Inc",
      });
    });

    it("lists all registered products", async () => {
      const result = await listProducts(e, {});

      expect(result.items.length).toBeGreaterThanOrEqual(2);
    });

    it("filters by manufacturer", async () => {
      const result = await listProducts(e, { manufacturer: "Acme Corp" });

      expect(
        result.items.every((p) => p.manufacturer === "Acme Corp")
      ).toBe(true);
    });
  });
});
