import { ROLE_BY_ID } from "@/lib/agents/roles";
import { PERSONALITIES } from "@/lib/agents/personality";
import type { AgentRole } from "@/lib/types";

export type NewAgent = {
  name: string;
  description: string | null;
  goal: string | null;
  budget: number;
  policy: {
    role: AgentRole;
    style: string;
    categories: string[];
    max_price?: number;
    min_price?: number;
    require_approval?: boolean;
  };
  firstListing?: {
    title: string;
    description: string | null;
    price: number;
    category: string;
    stock: number;
  };
};

const CATEGORY = /^[a-z][a-z0-9 -]{0,23}$/;
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN);

/**
 * Validate a create-agent request (the onboarding wizard and the agents
 * page). Pure, so it's unit tested; returns either the cleaned agent or a
 * message to show.
 */
export function parseNewAgent(body: unknown): NewAgent | { error: string } {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const p = (b.policy && typeof b.policy === "object" ? b.policy : {}) as Record<string, unknown>;

  const name = clean(b.name, 40);
  if (name.length < 2) return { error: "Give your agent a name (at least 2 characters)." };
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u.test(name)) {
    return { error: "Names can use letters, numbers, spaces and . _ ' -" };
  }

  const role = (typeof p.role === "string" && ROLE_BY_ID[p.role as AgentRole] ? p.role : "buyer") as AgentRole;
  const style = typeof p.style === "string" && PERSONALITIES.some((x) => x.id === p.style) ? p.style : clean(p.style, 24) || "balanced";

  const budget = Number.isFinite(num(b.budget)) ? Math.round(num(b.budget)) : 1000;
  if (budget < 10 || budget > 50_000) return { error: "Budget must be between £10 and £50,000." };

  const categories = (Array.isArray(p.categories) ? p.categories : [])
    .map((c) => clean(c, 24).toLowerCase())
    .filter((c) => CATEGORY.test(c))
    .slice(0, 6);

  const policy: NewAgent["policy"] = { role, style, categories };
  const maxPrice = num(p.max_price);
  if (Number.isFinite(maxPrice)) {
    if (maxPrice <= 0 || maxPrice > budget) return { error: "Max price per item must be above £0 and within the budget." };
    policy.max_price = Math.round(maxPrice);
  }
  const minPrice = num(p.min_price);
  if (Number.isFinite(minPrice) && minPrice > 0) policy.min_price = Math.round(minPrice);
  if (p.require_approval === true) policy.require_approval = true;

  let firstListing: NewAgent["firstListing"];
  if (b.first_listing && typeof b.first_listing === "object") {
    const l = b.first_listing as Record<string, unknown>;
    const title = clean(l.title, 60);
    const price = Math.round(num(l.price));
    if (title.length < 3) return { error: "Give the item a title (at least 3 characters)." };
    if (!Number.isFinite(price) || price < 1 || price > 50_000) return { error: "The item's price must be between £1 and £50,000." };
    const category = clean(l.category, 24).toLowerCase();
    const stock = Math.round(num(l.stock));
    firstListing = {
      title,
      description: clean(l.description, 280) || null,
      price,
      category: CATEGORY.test(category) ? category : "general",
      stock: Number.isFinite(stock) ? Math.min(20, Math.max(1, stock)) : 1,
    };
    if (policy.min_price && policy.min_price > price) policy.min_price = price;
  }

  return {
    name,
    description: clean(b.description, 280) || null,
    goal: clean(b.goal, 200) || clean(b.description, 200) || null,
    budget,
    policy,
    firstListing,
  };
}
