import { test, expect, negotiation } from "./fixtures";

test("one-click demo on the negotiate page plays a deal to the end", async ({ page }) => {
  await page.route("**/api/demo", (route) => route.fulfill({ status: 201, json: negotiation() }));
  let turns = 0;
  await page.route("**/api/negotiations", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    turns++;
    const done = negotiation({
      status: "accepted",
      current_offer: 72,
      messages: [
        ...negotiation().messages,
        { from: "seller", type: "accept", price: 72, message: "You've got a deal at £72.", timestamp: new Date().toISOString() },
      ],
    });
    return route.fulfill({ json: done });
  });

  await page.goto("/negotiate");
  await page.locator("#btn-one-click-demo-negotiate").click();
  await expect(page.getByText("Deal closed")).toBeVisible();
  await expect(page.getByText("You've got a deal at £72.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Share a replay/ })).toBeVisible();
  expect(turns).toBeGreaterThan(0);
});

test("the demo explains rate limits instead of failing silently", async ({ page }) => {
  await page.route("**/api/demo", (route) =>
    route.fulfill({ status: 429, json: { error: "Too many demo runs. Try again in about 1 minute." } })
  );
  await page.goto("/negotiate");
  await page.locator("#btn-one-click-demo-negotiate").click();
  await expect(page.getByText(/Too many demo runs/)).toBeVisible();
});

test("onboarding in demo mode builds an agent and lands in the village", async ({ page }) => {
  let sent: Record<string, unknown> | null = null;
  await page.route("**/api/agents", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    sent = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { id: "00000000-0000-4000-8000-0000000000aa", name: sent?.name } });
  });

  await page.goto("/start");
  await page.getByRole("button", { name: "Try it in demo mode" }).click();
  await page.getByLabel("Agent name").fill("Penny Finch");
  await page.getByRole("radio", { name: /Penny-pincher/ }).click();
  await page.getByRole("button", { name: /Build its cottage/ }).click();

  await expect(page).toHaveURL(/\/world\?welcome=00000000-0000-4000-8000-0000000000aa/);
  expect(sent).toMatchObject({ name: "Penny Finch", policy: { role: "buyer", style: "thrifty" } });
  // Demo agents can't require approval: there's no owner to ask
  expect((sent as unknown as { policy: { require_approval?: boolean } }).policy.require_approval).toBe(false);
  await expect(page.getByText(/Laying the foundations|Welcome to the village/)).toBeVisible();
});

test("the village has scene settings and a sound toggle", async ({ page }) => {
  await page.goto("/world");
  await expect(page.locator("canvas")).toBeVisible({ timeout: 60_000 });

  const sound = page.getByRole("button", { name: /Sound off/ });
  await sound.click();
  await expect(page.getByRole("button", { name: /Sound on/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Scene" }).click();
  const dialog = page.getByRole("dialog", { name: "Scene settings" });
  await dialog.getByRole("radio", { name: "Rain" }).click();
  await expect(dialog.getByRole("radio", { name: "Rain" })).toHaveAttribute("aria-checked", "true");
  // Saved for next time
  const saved = await page.evaluate(() => localStorage.getItem("botmart-world-settings"));
  expect(JSON.parse(saved || "{}")).toMatchObject({ weather: "rain" });
});

test("a shared replay link opens the village in replay mode", async ({ page }) => {
  await page.goto("/world?replay=00000000-0000-4000-8000-000000000001");
  await expect(page.getByText("Replaying a shared deal")).toBeVisible();
  await expect(page.getByRole("button", { name: /Copy link/ })).toBeVisible();
});

test("the leaderboard shows its four boards", async ({ page }) => {
  await page.goto("/leaderboard");
  for (const name of ["Best negotiators", "Biggest discounts", "Busiest districts", "Most trusted"]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
});

test("sign-in keeps you on BotMart after the magic link", async ({ request }) => {
  // The callback must never redirect off-site, whatever ?next= says
  const res = await request.get("/auth/callback?next=//evil.example", { maxRedirects: 0 });
  const location = res.headers()["location"] || "";
  expect(location).not.toContain("evil.example");
});
