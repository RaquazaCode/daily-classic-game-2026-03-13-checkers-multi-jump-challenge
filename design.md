# Design

## Goal
Build a deterministic single-screen checkers MVP that supports reliable unattended validation while adding one twist: Multi-jump challenge combo scoring.

## Core Loop
- Board is fixed to 8x8 and only dark squares are playable.
- Current player selects one legal piece and one legal destination.
- Mandatory captures apply; if any capture exists, quiet moves are blocked.
- Multi-jump continuation is enforced with the same piece.
- Match ends when one side has no pieces.

## Twist: Multi-jump challenge
- Base capture scores `30` points.
- If capture chain continues, bonus escalates (`+50` on second capture, then +20 each subsequent link).
- Turn cannot switch while a legal follow-up jump exists.

## Deterministic Hooks
- `window.advanceTime(ms)` advances state clock in fixed ticks.
- `window.render_game_to_text()` exports concise JSON state for scripted assertions.

## Input Model
- Mouse: select piece + destination.
- Keyboard: `Enter` start/restart, `P` pause, `R` reset.

## Verification Strategy
- Unit tests prove initial board, turn-locking chain captures, combo scoring, and pause/reset determinism.
- Playwright test captures title, mid-game, and paused states and writes `render_game_to_text` artifact.
