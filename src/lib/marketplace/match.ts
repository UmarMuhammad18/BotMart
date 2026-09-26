import { Agent, ListingWithSeller } from "@/lib/types";

export type SearchFilters = {
  keywords: string;
  maxPrice?: number;
  category?: string;
};

export function rankListings(listings: ListingWithSeller[], buyer: Agent) {
  const remaining = Number(buyer.budget) - Number(buyer.spent);
  const cats = (buyer.policy?.categories || []).map((c) => c.toLowerCase());
  const maxPrice = buyer.policy?.max_price;

  return listings
    .map((listing) => {
      let score = 0;
      const price = Number(listing.price);

      if (price <= remaining) score += 40;
      else score -= 40;

      if (maxPrice && price <= maxPrice) score += 15;
      else if (maxPrice && price > maxPrice) score -= 25;

      if (listing.category && cats.includes(listing.category.toLowerCase())) {
        score += 30;
      }

      const reputation = listing.seller?.reputation ?? 50;
      score += Math.min(Number(reputation), 100) / 5;

      if (remaining > 0) {
        const ratio = price / remaining;
        if (ratio > 0.15 && ratio < 0.7) score += 10;
      }

      return { ...listing, match_score: Math.round(score) };
    })
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
}

export function keywordMatches(listing: ListingWithSeller, keywords: string) {
  if (!keywords.trim()) return true;
  const hay = `${listing.title} ${listing.description || ""} ${listing.category || ""}`.toLowerCase();
  return keywords
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .some((word) => hay.includes(word));
}

export function applyFilters(listings: ListingWithSeller[], filters: SearchFilters) {
  return listings.filter((listing) => {
    if (filters.maxPrice && Number(listing.price) > filters.maxPrice) return false;
    if (
      filters.category &&
      (listing.category || "").toLowerCase() !== filters.category.toLowerCase()
    ) {
      return false;
    }
    return keywordMatches(listing, filters.keywords);
  });
}
