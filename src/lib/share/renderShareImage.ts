"use client";

import { formatYen } from "@/lib/format";

interface RenderShareImageParams {
  emoji: string;
  stageLabel: string;
  message: string;
  spent: number;
  budget: number;
  accentColor: string;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  // 日本語は単語区切りが無いため文字単位で折り返す
  let line = "";
  let cursorY = y;
  for (const char of text) {
    const testLine = line + char;
    if (line !== "" && ctx.measureText(testLine).width > maxWidth) {
      ctx.fillText(line, x, cursorY);
      line = char;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, cursorY);
}

export async function renderShareImage(params: RenderShareImageParams): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#ecfdf5");
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(400, 280, 150, 0, Math.PI * 2);
  ctx.fillStyle = params.accentColor;
  ctx.fill();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "150px sans-serif";
  ctx.fillText(params.emoji, 400, 285);

  ctx.fillStyle = "#1f2937";
  ctx.font = "bold 52px sans-serif";
  ctx.fillText(params.stageLabel, 400, 490);

  ctx.font = "26px sans-serif";
  ctx.fillStyle = "#6b7280";
  wrapText(ctx, params.message, 400, 545, 620, 34);

  ctx.font = "bold 38px sans-serif";
  ctx.fillStyle = "#1f2937";
  ctx.fillText(`今月の支出 ${formatYen(params.spent)} / ${formatYen(params.budget)}`, 400, 660);

  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "#22a06b";
  ctx.fillText("太る家計簿", 400, 740);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
