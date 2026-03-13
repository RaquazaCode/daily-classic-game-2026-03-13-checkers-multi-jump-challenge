const BOARD_SIZE = 8;
const TICK_MS = 100;

function keyOf(row, col) {
  return `${row},${col}`;
}

function fromKey(key) {
  const [row, col] = key.split(",").map((value) => Number.parseInt(value, 10));
  return { row, col };
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function isDarkSquare(row, col) {
  return (row + col) % 2 === 1;
}

function cloneBoard(board) {
  return board.map((row) => row.map((piece) => (piece ? { ...piece } : null)));
}

function createOpeningBoard() {
  const board = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null));

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (isDarkSquare(row, col)) {
        board[row][col] = { color: "black", king: false };
      }
    }
  }

  for (let row = 5; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (isDarkSquare(row, col)) {
        board[row][col] = { color: "red", king: false };
      }
    }
  }

  return board;
}

function getDirections(piece) {
  if (piece.king) {
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];
  }
  return piece.color === "red"
    ? [
        [-1, -1],
        [-1, 1]
      ]
    : [
        [1, -1],
        [1, 1]
      ];
}

function simpleMovesForPiece(board, row, col, piece) {
  const moves = [];
  for (const [dr, dc] of getDirections(piece)) {
    const targetRow = row + dr;
    const targetCol = col + dc;
    if (!inBounds(targetRow, targetCol) || !isDarkSquare(targetRow, targetCol)) {
      continue;
    }
    if (!board[targetRow][targetCol]) {
      moves.push({ row: targetRow, col: targetCol, capture: false });
    }
  }
  return moves;
}

function captureMovesForPiece(board, row, col, piece) {
  const moves = [];
  for (const [dr, dc] of getDirections(piece)) {
    const midRow = row + dr;
    const midCol = col + dc;
    const landingRow = row + dr * 2;
    const landingCol = col + dc * 2;

    if (!inBounds(midRow, midCol) || !inBounds(landingRow, landingCol)) {
      continue;
    }
    if (!isDarkSquare(landingRow, landingCol)) {
      continue;
    }

    const jumped = board[midRow][midCol];
    const landing = board[landingRow][landingCol];
    if (jumped && jumped.color !== piece.color && !landing) {
      moves.push({ row: landingRow, col: landingCol, capture: true, jumped: { row: midRow, col: midCol } });
    }
  }
  return moves;
}

function findPieces(board, color) {
  const found = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        found.push({ row, col, piece });
      }
    }
  }
  return found;
}

function allCaptureMoves(board, color) {
  const result = new Map();
  for (const { row, col, piece } of findPieces(board, color)) {
    const moves = captureMovesForPiece(board, row, col, piece);
    if (moves.length > 0) {
      result.set(keyOf(row, col), moves);
    }
  }
  return result;
}

function allSimpleMoves(board, color) {
  const result = new Map();
  for (const { row, col, piece } of findPieces(board, color)) {
    const moves = simpleMovesForPiece(board, row, col, piece);
    if (moves.length > 0) {
      result.set(keyOf(row, col), moves);
    }
  }
  return result;
}

function hasAnyLegalMove(state, color) {
  const captures = allCaptureMoves(state.board, color);
  if (captures.size > 0) {
    return true;
  }
  return allSimpleMoves(state.board, color).size > 0;
}

function countPieces(board) {
  const tally = { red: 0, black: 0 };
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (piece) {
        tally[piece.color] += 1;
      }
    }
  }
  return tally;
}

function startingState(seed = 1) {
  return {
    seed,
    mode: "title",
    board: createOpeningBoard(),
    turn: "red",
    selected: null,
    forcedPiece: null,
    multiJumpActive: false,
    chainCaptures: 0,
    score: { red: 0, black: 0 },
    winner: null,
    timeMs: 0,
    events: { last: "ready" }
  };
}

function setSelected(state, row, col) {
  state.selected = keyOf(row, col);
}

function clearSelection(state) {
  state.selected = null;
}

function currentSelection(state) {
  return state.selected ? fromKey(state.selected) : null;
}

function capturePoints(chainCount) {
  if (chainCount <= 1) {
    return 30;
  }
  return 50 + (chainCount - 2) * 20;
}

function maybePromote(piece, row) {
  if (piece.king) {
    return;
  }
  if (piece.color === "red" && row === 0) {
    piece.king = true;
  }
  if (piece.color === "black" && row === BOARD_SIZE - 1) {
    piece.king = true;
  }
}

function opponentOf(color) {
  return color === "red" ? "black" : "red";
}

function switchTurn(state) {
  state.turn = opponentOf(state.turn);
  state.forcedPiece = null;
  state.multiJumpActive = false;
  state.chainCaptures = 0;
  clearSelection(state);
}

function maybeFinishGame(state) {
  const counts = countPieces(state.board);
  if (counts.red === 0) {
    state.mode = "gameover";
    state.winner = "black";
    state.events.last = "gameover-black";
    return true;
  }
  if (counts.black === 0) {
    state.mode = "gameover";
    state.winner = "red";
    state.events.last = "gameover-red";
    return true;
  }

  if (!hasAnyLegalMove(state, state.turn)) {
    state.mode = "gameover";
    state.winner = opponentOf(state.turn);
    state.events.last = `gameover-${state.winner}-no-moves`;
    return true;
  }

  return false;
}

function applyMove(state, from, move) {
  const piece = state.board[from.row][from.col];
  state.board[from.row][from.col] = null;
  state.board[move.row][move.col] = piece;
  maybePromote(piece, move.row);

  if (move.capture) {
    const jumped = move.jumped;
    state.board[jumped.row][jumped.col] = null;
    state.chainCaptures += 1;
    const points = capturePoints(state.chainCaptures);
    state.score[piece.color] += points;

    const followUps = captureMovesForPiece(state.board, move.row, move.col, piece);
    if (followUps.length > 0) {
      state.forcedPiece = keyOf(move.row, move.col);
      state.multiJumpActive = true;
      setSelected(state, move.row, move.col);
      state.events.last = `capture-chain-${state.chainCaptures}`;
      return;
    }

    state.events.last = `capture-finished-${state.chainCaptures}`;
    switchTurn(state);
    maybeFinishGame(state);
    return;
  }

  state.score[piece.color] += 5;
  state.events.last = "move";
  switchTurn(state);
  maybeFinishGame(state);
}

function legalMovesForSelected(state, row, col) {
  const piece = state.board[row][col];
  if (!piece || piece.color !== state.turn) {
    return [];
  }

  if (state.forcedPiece) {
    if (state.forcedPiece !== keyOf(row, col)) {
      return [];
    }
    return captureMovesForPiece(state.board, row, col, piece);
  }

  const allCaptures = allCaptureMoves(state.board, state.turn);
  if (allCaptures.size > 0) {
    return allCaptures.get(keyOf(row, col)) || [];
  }

  return simpleMovesForPiece(state.board, row, col, piece);
}

function applyDebugBoard(state, payload) {
  const fresh = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null));

  for (const side of ["red", "black"]) {
    const pieces = Array.isArray(payload?.[side]) ? payload[side] : [];
    for (const item of pieces) {
      if (!inBounds(item.row, item.col)) {
        continue;
      }
      fresh[item.row][item.col] = { color: side, king: Boolean(item.king) };
    }
  }

  state.board = fresh;
  state.turn = payload?.turn === "black" ? "black" : "red";
  state.mode = "running";
  state.forcedPiece = null;
  state.multiJumpActive = false;
  state.chainCaptures = 0;
  clearSelection(state);
  state.score = { red: 0, black: 0 };
  state.winner = null;
  state.events.last = "debug-board-set";
}

export function createGame(seed = 1) {
  return startingState(seed);
}

export function step(state, elapsedMs) {
  const ticks = Math.max(0, Math.floor(elapsedMs / TICK_MS));
  if (state.mode !== "running") {
    return;
  }
  state.timeMs += ticks * TICK_MS;
}

export function input(state, action, payload = {}) {
  switch (action) {
    case "start": {
      if (state.mode === "title") {
        state.mode = "running";
        state.events.last = "start";
      } else if (state.mode === "gameover") {
        const fresh = startingState(state.seed);
        Object.assign(state, fresh);
        state.mode = "running";
      } else if (state.mode === "paused") {
        state.mode = "running";
      }
      break;
    }
    case "togglePause": {
      if (state.mode === "running") {
        state.mode = "paused";
      } else if (state.mode === "paused") {
        state.mode = "running";
      }
      break;
    }
    case "reset": {
      const fresh = startingState(state.seed);
      Object.assign(state, fresh);
      break;
    }
    case "debugSetBoard": {
      applyDebugBoard(state, payload);
      break;
    }
    case "select": {
      if (state.mode !== "running") {
        break;
      }
      const row = Number.parseInt(payload.row, 10);
      const col = Number.parseInt(payload.col, 10);
      if (!inBounds(row, col)) {
        break;
      }
      const moves = legalMovesForSelected(state, row, col);
      if (moves.length > 0) {
        setSelected(state, row, col);
      }
      break;
    }
    case "move": {
      if (state.mode !== "running") {
        break;
      }
      const selected = currentSelection(state);
      if (!selected) {
        break;
      }
      const moves = legalMovesForSelected(state, selected.row, selected.col);
      const targetRow = Number.parseInt(payload.row, 10);
      const targetCol = Number.parseInt(payload.col, 10);
      const selectedMove = moves.find((move) => move.row === targetRow && move.col === targetCol);
      if (!selectedMove) {
        break;
      }
      applyMove(state, selected, selectedMove);
      break;
    }
    default:
      break;
  }
}

function serializeBoard(board) {
  const lines = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    const cells = [];
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece) {
        cells.push(".");
      } else if (piece.color === "red") {
        cells.push(piece.king ? "R" : "r");
      } else {
        cells.push(piece.king ? "B" : "b");
      }
    }
    lines.push(cells.join(""));
  }
  return lines;
}

export function renderGameToText(state) {
  const counts = countPieces(state.board);
  const selected = state.selected;
  const legalTargets = selected
    ? legalMovesForSelected(state, fromKey(selected).row, fromKey(selected).col).map((move) => keyOf(move.row, move.col))
    : [];

  return JSON.stringify({
    mode: state.mode,
    timeMs: state.timeMs,
    turn: state.turn,
    selected,
    legalTargets,
    multiJumpActive: state.multiJumpActive,
    score: { ...state.score },
    redPieces: counts.red,
    blackPieces: counts.black,
    winner: state.winner,
    lastEvent: state.events.last,
    forcedPiece: state.forcedPiece,
    board: serializeBoard(cloneBoard(state.board))
  });
}
