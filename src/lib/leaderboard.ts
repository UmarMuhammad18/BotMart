/**
 * Leaderboard maths, kept pure so it's tested. Rows are settled orders with
 * the listing's asking price; "discount" is how far under asking a deal
 * closed.
 */
export type DealRow = {
  id: string;
  final_price: number;
  created_at: string;
  asking: number;
  title: string;
  category: string | null;
  buyer_id: string;
  buyer_name: string;
  seller_id: string;
  seller_name: string;
};

export type AgentRow = { id: string; name: string; reputation: number; role: string; trades: number };

export type Leaderboard = {
  negotiators: { id: string; name: string; deals: number; avgDiscount: number; saved: number }[];
  discounts: { id: string; title: string; buyer: string; seller: string; asking: number; price: number; discount: number }[];
  districts: { id: string; deals: number; volume: number }[];
  trusted: AgentRow[];
};

const discountOf = (d: DealRow) => (d.asking > 0 ? Math.max(0, (d.asking - d.final_price) / d.asking) : 0);

export function buildLeaderboard(deals: DealRow[], agents: AgentRow[], { minDeals = 2 } = {}): Leaderboard {
  // Old self-trades (an agent buying from itself) don't count
  const valid = deals.filter((d) => d.final_price > 0 && d.asking > 0 && d.buyer_id !== d.seller_id);

  const byBuyer = new Map<string, { name: string; n: number; sum: number; saved: number }>();
  for (const d of valid) {
    const b = byBuyer.get(d.buyer_id) ?? { name: d.buyer_name, n: 0, sum: 0, saved: 0 };
    b.n += 1;
    b.sum += discountOf(d);
    b.saved += Math.max(0, d.asking - d.final_price);
    byBuyer.set(d.buyer_id, b);
  }
  const negotiators = [...byBuyer.entries()]
    .filter(([, b]) => b.n >= minDeals)
    .map(([id, b]) => ({ id, name: b.name, deals: b.n, avgDiscount: b.sum / b.n, saved: Math.round(b.saved) }))
    .sort((a, b) => b.avgDiscount - a.avgDiscount || b.deals - a.deals)
    .slice(0, 10);

  const discounts = valid
    .map((d) => ({
      id: d.id,
      title: d.title,
      buyer: d.buyer_name,
      seller: d.seller_name,
      asking: d.asking,
      price: d.final_price,
      discount: discountOf(d),
    }))
    .sort((a, b) => b.discount - a.discount || b.asking - a.asking)
    .slice(0, 10);

  const byDistrict = new Map<string, { deals: number; volume: number }>();
  for (const d of valid) {
    const key = (d.category || "general").toLowerCase();
    const x = byDistrict.get(key) ?? { deals: 0, volume: 0 };
    x.deals += 1;
    x.volume += d.final_price;
    byDistrict.set(key, x);
  }
  const districts = [...byDistrict.entries()]
    .map(([id, x]) => ({ id, deals: x.deals, volume: Math.round(x.volume) }))
    .sort((a, b) => b.deals - a.deals || b.volume - a.volume);

  const trusted = [...agents]
    .filter((a) => a.trades > 0 || a.reputation !== 50)
    .sort((a, b) => b.reputation - a.reputation || b.trades - a.trades)
    .slice(0, 10);

  return { negotiators, discounts, districts, trusted };
}
