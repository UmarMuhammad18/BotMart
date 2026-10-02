import { rankListings, applyFilters } from "../match";
import type { Agent, ListingWithSeller } from "@/lib/types";

function agent(partial: Partial<Agent>): Agent {
  return {
    id: "a1",
    name: "TestBuyer",
    owner_id: null,
    description: null,
    budget: 500,
    spent: 0,
    policy: { max_price: 100, categories: ["electronics"], style: "thrifty" },
    reputation: 50,
    status: "active",
    goal: null,
    memory: [],
    trades_completed: 0,
    trades_failed: 0,
    created_at: new Date().toISOString(),
    ...partial,
  };
}

function listing(partial: Partial<ListingWithSeller>): ListingWithSeller {
  return {
    id: "l1",
    seller_agent_id: "s1",
    title: "Headphones",
    description: "Noise cancelling",
    price: 80,
    category: "electronics",
    stock: 1,
    terms: {},
    status: "active",
    created_at: new Date().toISOString(),
    seller: { id: "s1", name: "GadgetSeller", reputation: 60 },
    ...partial,
  };
}

describe("rankListings", () => {
  it("prefers affordable listings in preferred categories", () => {
    const buyer = agent({});
    const ranked = rankListings(
      [
        listing({ id: "cheap", price: 50, category: "electronics" }),
        listing({
          id: "expensive",
          price: 400,
          category: "electronics",
          seller: { id: "s2", name: "Other", reputation: 50 },
        }),
      ],
      buyer
    );
    expect(ranked[0].id).toBe("cheap");
    expect((ranked[0].match_score ?? 0) > (ranked[1].match_score ?? 0)).toBe(
      true
    );
  });

  it("boosts high-reputation sellers", () => {
    const buyer = agent({});
    const ranked = rankListings(
      [
        listing({
          id: "lowrep",
          seller: { id: "s1", name: "Low", reputation: 20 },
        }),
        listing({
          id: "hirep",
          seller_agent_id: "s2",
          seller: { id: "s2", name: "High", reputation: 90 },
        }),
      ],
      buyer
    );
    expect(ranked[0].id).toBe("hirep");
  });
});

describe("applyFilters", () => {
  it("filters by max price and keywords", () => {
    const list = [
      listing({ id: "1", title: "USB Cable", price: 20 }),
      listing({ id: "2", title: "GPU Cloud", price: 200 }),
    ];
    const filtered = applyFilters(list, {
      keywords: "usb",
      maxPrice: 50,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });
});
