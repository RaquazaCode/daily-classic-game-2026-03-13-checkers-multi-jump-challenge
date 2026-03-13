export function createGame() {
  return { mode: "title" };
}

export function input() {}

export function step() {}

export function renderGameToText(state) {
  return JSON.stringify(state);
}
