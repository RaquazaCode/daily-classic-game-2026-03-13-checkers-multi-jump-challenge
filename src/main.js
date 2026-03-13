import { createGame, input, renderGameToText, step } from "./game-core.js";

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const state = createGame();

function render() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Enter") input(state, "start");
  if (event.key.toLowerCase() === "p") input(state, "togglePause");
  if (event.key.toLowerCase() === "r") input(state, "reset");
  render();
});

window.advanceTime = (ms) => {
  step(state, ms);
  render();
};

window.render_game_to_text = () => renderGameToText(state);

render();
