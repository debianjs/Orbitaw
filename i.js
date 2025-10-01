// generateBanner.js
import { createCanvas } from "canvas";
import fs from "fs";

const width = 800;
const height = 250;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

// Fondo degradado diagonal
const gradient = ctx.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, "#1e3c72");
gradient.addColorStop(1, "#2a5298");
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

// Círculos decorativos translúcidos
function drawCircle(x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}
drawCircle(150, 200, 80, "rgba(255,255,255,0.1)");
drawCircle(650, 70, 100, "rgba(255,255,255,0.08)");
drawCircle(400, 125, 60, "rgba(255,255,255,0.06)");

// Texto principal
ctx.font = "bold 48px Sans-serif";
ctx.fillStyle = "#ffffff";
ctx.textAlign = "center";
ctx.shadowColor = "rgba(0,0,0,0.4)";
ctx.shadowBlur = 6;
ctx.fillText("¡Bienvenido al servidor!", width / 2, height / 2 + 60);

// Rectángulo semitransparente central
ctx.fillStyle = "rgba(255,255,255,0.15)";
ctx.fillRect(width / 2 - 180, height / 2 - 40, 360, 80);

// Guardar banner
const buffer = canvas.toBuffer("image/png");
fs.writeFileSync("src/assets/banner.png", buffer);

console.log("✅ banner bonito generado en src/assets/banner.png");
