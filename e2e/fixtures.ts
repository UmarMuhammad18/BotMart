import { test as base, expect, type Page } from "@playwright/test";

/**
 * Every test gets a page where API writes are answered locally: nothing a
 * test clicks can create agents, negotiations or orders in the real
 * database. Reads (GET) still hit the server so pages render real data.
 */
const WRITE_ROUTES = /\/api\/(demo|seed|negotiations|agents|court|auctions|orders|notifications|listings)(\/|\?|$)/;

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, provide) => {
    await page.route(WRITE_ROUTES, async (route) => {
      if (route.request().method() === "GET") return route.continue();
      return route.fulfill({ status: 501, json: { error: "Blocked in e2e: mock this route in the test" } });
    });
    await provide(page);
  },
});

export { expect };

/** A negotiation as the API returns it. */
export function negotiation(over: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    status: "open",
    current_offer: 64,
    messages: [
      {
        from: "buyer",
        type: "offer",
        price: 64,
        message: 'I\'d like to buy "Premium Wireless Headphones". My opening offer is £64.',
        timestamp: new Date().toISOString(),
      },
    ],
    buyer: { id: "b", name: "BargainBot", budget: 500, spent: 0 },
    seller: { id: "s", name: "GadgetSeller", budget: 1000, spent: 0 },
    listing: { id: "l", title: "Premium Wireless Headphones", price: 80 },
    ...over,
  };
}
