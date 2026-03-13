import assert from "node:assert/strict";
import test from "node:test";

import { createGame, input, renderGameToText, step } from "../src/game-core.js";

function snapshot(state) {
  return JSON.parse(renderGameToText(state));
}

test("starts with title mode and 12 pieces per side", () => {
  const state = createGame(20260313);
  const view = snapshot(state);

  assert.equal(view.mode, "title");
  assert.equal(view.turn, "red");
  assert.equal(view.redPieces, 12);
  assert.equal(view.blackPieces, 12);
  assert.equal(view.multiJumpActive, false);
});

test("starting game allows selecting only current-turn piece", () => {
  const state = createGame(1);
  input(state, "start");
  input(state, "select", { row: 5, col: 0 });
  let view = snapshot(state);
  assert.equal(view.selected, "5,0");

  input(state, "select", { row: 2, col: 1 });
  view = snapshot(state);
  assert.equal(view.selected, "5,0");
});

test("multi-jump challenge keeps turn until chain finishes and awards combo score", () => {
  const state = createGame(2);
  input(state, "start");
  input(state, "debugSetBoard", {
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

  input(state, "select", { row: 5, col: 0 });
  input(state, "move", { row: 3, col: 2 });

  let view = snapshot(state);
  assert.equal(view.multiJumpActive, true);
  assert.equal(view.turn, "red");
  assert.equal(view.score.red, 30);

  input(state, "move", { row: 1, col: 4 });
  view = snapshot(state);
  assert.equal(view.multiJumpActive, false);
  assert.equal(view.turn, "black");
  assert.equal(view.score.red, 80);
  assert.equal(view.blackPieces, 0);
});

test("pause freezes clock and reset restores opening state", () => {
  const state = createGame(3);
  input(state, "start");
  step(state, 3000);
  const before = snapshot(state);

  input(state, "togglePause");
  step(state, 5000);
  const paused = snapshot(state);
  assert.equal(paused.mode, "paused");
  assert.equal(paused.timeMs, before.timeMs);

  input(state, "reset");
  const reset = snapshot(state);
  assert.equal(reset.mode, "title");
  assert.equal(reset.redPieces, 12);
  assert.equal(reset.blackPieces, 12);
  assert.equal(reset.score.red, 0);
  assert.equal(reset.score.black, 0);
});
