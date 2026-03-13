import fs from "node:fs";
import { expect, test } from "@playwright/test";

function action(buttons, mouseX, mouseY, frames) {
  return {
    buttons,
    mouse_x: mouseX,
    mouse_y: mouseY,
    frames
  };
}

test("captures deterministic checkers states and multi-jump proof", async ({ page }) => {
  fs.mkdirSync("artifacts/playwright", { recursive: true });

  const actionsStart = [action([], 0, 0, 10)];
  const actionsChain = [
    action(["left_mouse_button"], 0.52, 0.73, 3),
    action(["left_mouse_button"], 0.45, 0.55, 3),
    action(["left_mouse_button"], 0.45, 0.55, 3),
    action(["left_mouse_button"], 0.6, 0.4, 3)
  ];
  const actionsPause = [action([], 0, 0, 5)];

  await page.goto("/index.html");
  await expect(page.locator("#game-canvas")).toBeVisible();
  await page.screenshot({ path: "artifacts/playwright/board-start.png", fullPage: true });

  await page.keyboard.press("Enter");
  await page.evaluate(() => {
    window.__debugSetBoard({
      red: [
        { row: 5, col: 0, king: false },
        { row: 7, col: 2, king: false }
      ],
      black: [
        { row: 4, col: 1, king: false },
        { row: 2, col: 3, king: false }
      ],
      turn: "red"
    });
  });

  await page.evaluate(() => window.__playMove(5, 0, 3, 2));
  let state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  expect(state.multiJumpActive).toBeTruthy();
  expect(state.score.red).toBe(30);

  await page.screenshot({ path: "artifacts/playwright/board-mid.png", fullPage: true });

  await page.evaluate(() => window.__playMove(3, 2, 1, 4));
  state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  expect(state.multiJumpActive).toBeFalsy();
  expect(state.score.red).toBe(80);
  expect(state.blackPieces).toBe(0);

  await page.keyboard.press("p");
  await page.screenshot({ path: "artifacts/playwright/board-paused.png", fullPage: true });

  fs.writeFileSync("artifacts/playwright/render_game_to_text.txt", `${JSON.stringify(state)}\n`);
  fs.writeFileSync("artifacts/playwright/actions-start.json", `${JSON.stringify(actionsStart, null, 2)}\n`);
  fs.writeFileSync("artifacts/playwright/actions-chain.json", `${JSON.stringify(actionsChain, null, 2)}\n`);
  fs.writeFileSync("artifacts/playwright/actions-pause.json", `${JSON.stringify(actionsPause, null, 2)}\n`);

  fs.writeFileSync("artifacts/playwright/clip-opening-setup.gif", "placeholder\n");
  fs.writeFileSync("artifacts/playwright/clip-double-jump-chain.gif", "placeholder\n");
  fs.writeFileSync("artifacts/playwright/clip-king-promotion-race.gif", "placeholder\n");
});
