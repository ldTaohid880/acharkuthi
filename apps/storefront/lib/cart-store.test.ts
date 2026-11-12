import { beforeEach, describe, expect, it } from "vitest";
import { cartTotal, useCart } from "./cart-store";

const line = {
  variantId: 1,
  productName: "Mango",
  variantLabel: "250g",
  unitPrice: 25000,
  quantity: 1,
};

describe("cart store", () => {
  beforeEach(() => useCart.getState().clear());

  it("merges quantities for the same variant", () => {
    useCart.getState().add(line);
    useCart.getState().add({ ...line, quantity: 2 });
    expect(useCart.getState().lines).toHaveLength(1);
    expect(useCart.getState().lines[0]?.quantity).toBe(3);
  });

  it("totals in paisa", () => {
    useCart.getState().add({ ...line, quantity: 2 });
    expect(cartTotal(useCart.getState().lines)).toBe(50000);
  });
});

describe("acceptPrice", () => {
  beforeEach(() => useCart.getState().clear());

  it("sets the line's unit price and keeps its quantity", () => {
    useCart.getState().add({ ...line, quantity: 2 });
    useCart.getState().acceptPrice(1, 27000);
    expect(useCart.getState().lines[0]).toMatchObject({ unitPrice: 27000, quantity: 2 });
  });
});
