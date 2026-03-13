import { createGame, input, renderGameToText, step } from "./game-core.js";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const state = createGame(20260313);

const BOARD_PADDING = 64;
const BOARD_SIZE_PX = 512;
const CELL = BOARD_SIZE_PX / 8;
const BOARD_X = (canvas.width - BOARD_SIZE_PX) / 2;
const BOARD_Y = 84;
const TICK_MS = 100;

let lastFrame = performance.now();
let accumulator = 0;

function parseState() {
  return JSON.parse(renderGameToText(state));
}

function squareFromPointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;

  const col = Math.floor((x - BOARD_X) / CELL);
  const row = Math.floor((y - BOARD_Y) / CELL);
  if (row < 0 || row > 7 || col < 0 || col > 7) {
    return null;
  }
  return { row, col };
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#faeed6");
  gradient.addColorStop(0.5, "#c99254");
  gradient.addColorStop(1, "#6d4428");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(23, 12, 7, 0.35)";
  ctx.fillRect(BOARD_X - 18, BOARD_Y - 18, BOARD_SIZE_PX + 36, BOARD_SIZE_PX + 36);
}

function drawBoard(snapshot) {
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const x = BOARD_X + col * CELL;
      const y = BOARD_Y + row * CELL;
      const isDark = (row + col) % 2 === 1;
      ctx.fillStyle = isDark ? "#5d2f18" : "#f3dfbd";
      ctx.fillRect(x, y, CELL, CELL);
    }
  }

  ctx.strokeStyle = "#2b170d";
  ctx.lineWidth = 6;
  ctx.strokeRect(BOARD_X, BOARD_Y, BOARD_SIZE_PX, BOARD_SIZE_PX);

  if (snapshot.selected) {
    const [row, col] = snapshot.selected.split(",").map((v) => Number.parseInt(v, 10));
    ctx.strokeStyle = "#f1f74f";
    ctx.lineWidth = 4;
    ctx.strokeRect(BOARD_X + col * CELL + 4, BOARD_Y + row * CELL + 4, CELL - 8, CELL - 8);
  }

  for (const target of snapshot.legalTargets) {
    const [row, col] = target.split(",").map((v) => Number.parseInt(v, 10));
    const x = BOARD_X + col * CELL + CELL / 2;
    const y = BOARD_Y + row * CELL + CELL / 2;
    ctx.fillStyle = "rgba(91, 255, 144, 0.75)";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPiece(row, col, char) {
  if (char === ".") {
    return;
  }

  const x = BOARD_X + col * CELL + CELL / 2;
  const y = BOARD_Y + row * CELL + CELL / 2;
  const isRed = char === "r" || char === "R";
  const king = char === "R" || char === "B";

  ctx.fillStyle = isRed ? "#d6423b" : "#151515";
  ctx.beginPath();
  ctx.arc(x, y, CELL * 0.34, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.stroke();

  if (king) {
    ctx.fillStyle = "#ffd249";
    ctx.font = "700 20px 'Trebuchet MS', 'Avenir Next', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("K", x, y + 7);
  }
}

function drawPieces(snapshot) {
  for (let row = 0; row < snapshot.board.length; row += 1) {
    const line = snapshot.board[row];
    for (let col = 0; col < line.length; col += 1) {
      drawPiece(row, col, line[col]);
    }
  }
}

function drawHud(snapshot) {
  ctx.fillStyle = "rgba(18, 8, 4, 0.72)";
  ctx.fillRect(48, 18, canvas.width - 96, 54);

  ctx.fillStyle = "#fff6e8";
  ctx.font = "700 22px 'Trebuchet MS', 'Avenir Next', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Red ${snapshot.score.red} - ${snapshot.score.black} Black`, canvas.width / 2, 43);

  ctx.font = "600 13px 'Trebuchet MS', 'Avenir Next', sans-serif";
  const status =
    snapshot.mode === "gameover"
      ? `Winner: ${snapshot.winner}`
      : snapshot.multiJumpActive
        ? `Turn: ${snapshot.turn} • Multi-jump active`
        : `Turn: ${snapshot.turn}`;
  ctx.fillText(`${status} • Time ${Math.floor(snapshot.timeMs / 1000)}s`, canvas.width / 2, 62);

  ctx.textAlign = "left";
  ctx.fillText("Enter start/restart • P pause • R reset", 56, canvas.height - 18);
}

function drawOverlay(snapshot) {
  if (snapshot.mode !== "title" && snapshot.mode !== "paused" && snapshot.mode !== "gameover") {
    return;
  }

  ctx.fillStyle = "rgba(8, 4, 2, 0.66)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff9ed";
  ctx.textAlign = "center";
  ctx.font = "700 42px 'Trebuchet MS', 'Avenir Next', sans-serif";

  if (snapshot.mode === "title") {
    ctx.fillText("Checkers: Multi-jump Challenge", canvas.width / 2, 286);
    ctx.font = "500 20px 'Trebuchet MS', 'Avenir Next', sans-serif";
    ctx.fillText("Press Enter or click board to start", canvas.width / 2, 320);
  } else if (snapshot.mode === "paused") {
    ctx.fillText("Paused", canvas.width / 2, 286);
    ctx.font = "500 20px 'Trebuchet MS', 'Avenir Next', sans-serif";
    ctx.fillText("Press P to resume", canvas.width / 2, 320);
  } else {
    ctx.fillText(`${snapshot.winner?.toUpperCase() || "RED"} Wins`, canvas.width / 2, 286);
    ctx.font = "500 20px 'Trebuchet MS', 'Avenir Next', sans-serif";
    ctx.fillText("Press Enter to restart", canvas.width / 2, 320);
  }
}

function render() {
  const snapshot = parseState();
  drawBackground();
  drawBoard(snapshot);
  drawPieces(snapshot);
  drawHud(snapshot);
  drawOverlay(snapshot);
}

function frame(now) {
  const delta = now - lastFrame;
  lastFrame = now;
  accumulator += delta;

  while (accumulator >= TICK_MS) {
    step(state, TICK_MS);
    accumulator -= TICK_MS;
  }

  render();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "enter") {
    input(state, "start");
    event.preventDefault();
  } else if (key === "p") {
    input(state, "togglePause");
    event.preventDefault();
  } else if (key === "r") {
    input(state, "reset");
    event.preventDefault();
  } else if (key === "f") {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
    event.preventDefault();
  }
  render();
});

canvas.addEventListener("click", (event) => {
  const square = squareFromPointer(event.clientX, event.clientY);
  if (!square) {
    if (state.mode === "title" || state.mode === "gameover") {
      input(state, "start");
      render();
    }
    return;
  }

  if (state.mode === "title" || state.mode === "gameover") {
    input(state, "start");
  }

  const snapshot = parseState();
  if (snapshot.selected) {
    input(state, "move", square);
    const after = parseState();
    if (after.selected === snapshot.selected) {
      input(state, "select", square);
    }
  } else {
    input(state, "select", square);
  }

  render();
});

window.advanceTime = (ms) => {
  const ticks = Math.max(1, Math.round(ms / TICK_MS));
  for (let i = 0; i < ticks; i += 1) {
    step(state, TICK_MS);
  }
  render();
};

window.render_game_to_text = () => renderGameToText(state);
window.__debugSetBoard = (payload) => {
  input(state, "debugSetBoard", payload);
  render();
};
window.__playMove = (fromRow, fromCol, toRow, toCol) => {
  input(state, "select", { row: fromRow, col: fromCol });
  input(state, "move", { row: toRow, col: toCol });
  render();
};

render();
requestAnimationFrame(frame);
