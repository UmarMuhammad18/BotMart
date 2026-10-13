import { test, expect } from "./fixtures";

// Every main page renders, has one h1 and no uncaught errors
const PAGES = ["/", "/agents", "/listings", "/negotiate", "/world", "/court", "/leaderboard", "/dashboard", "/start", "/login"];

for (const path of PAGES) {
  test(`${path} renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("the theme choice persists across reloads, without a flash", async ({ page, isMobile }) => {
  test.skip(!!isMobile, "theme menu is in the desktop header");
  await page.goto("/");
  await page.getByRole("button", { name: /^Theme:/ }).click();
  await page.getByRole("menuitemradio", { name: /Dark/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  // The class is set by the inline head script before hydration
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: /^Theme:/ }).click();
  await page.getByRole("menuitemradio", { name: /Light/ }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
