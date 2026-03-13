import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("capture deterministic checkers states", async ({ page }) => {
  fs.mkdirSync("artifacts/playwright", { recursive: true });
  await page.goto("/index.html");
  await expect(page.locator("#game-canvas")).toBeVisible();

  await page.screenshot({ path: "artifacts/playwright/board-start.png", fullPage: true });
  await page.keyboard.press("Enter");
  await page.evaluate(() => window.advanceTime(1000));
  await page.screenshot({ path: "artifacts/playwright/board-mid.png", fullPage: true });

  await page.keyboard.press("p");
  await page.screenshot({ path: "artifacts/playwright/board-paused.png", fullPage: true });

  const text = await page.evaluate(() => window.render_game_to_text());
  fs.writeFileSync("artifacts/playwright/render_game_to_text.txt", `${text}\n`);
});
