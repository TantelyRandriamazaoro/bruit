/** Subset of Lucide's IconNode used for canvas rasterization. */
export type LucideIconNode = Array<
  [string, Record<string, string | number | undefined>]
>;

type MarkerColors = {
  top: string;
  mid: string;
  bottom: string;
};

/**
 * Rasterize a Lucide iconNode onto an Apple Maps-style circular POI badge
 * for MapLibre `addImage`.
 */
export function createLucideMarkerIcon(
  iconNode: LucideIconNode,
  colors: MarkerColors,
  size = 128,
): { width: number; height: number; data: Uint8Array } {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      width: size,
      height: size,
      data: new Uint8Array(size * size * 4),
    };
  }

  const cx = size / 2;
  const cy = size / 2 - size * 0.015;
  const radius = size * 0.31;

  ctx.save();
  ctx.translate(cx, cy + radius * 0.92);
  ctx.scale(1, 0.38);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.95);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.28)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const body = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
  body.addColorStop(0, colors.top);
  body.addColorStop(0.45, colors.mid);
  body.addColorStop(1, colors.bottom);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  const gloss = ctx.createLinearGradient(
    cx,
    cy - radius,
    cx,
    cy + radius * 0.15,
  );
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.34)");
  gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = gloss;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius - size * 0.008, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(2, size * 0.028);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.96)";
  ctx.stroke();

  drawLucideIconNode(ctx, iconNode, {
    cx,
    cy: cy + size * 0.01,
    size: size * 0.42,
    color: "#ffffff",
    strokeWidth: 2.15,
  });

  const imageData = ctx.getImageData(0, 0, size, size);
  return {
    width: size,
    height: size,
    data: new Uint8Array(imageData.data),
  };
}

function drawLucideIconNode(
  ctx: CanvasRenderingContext2D,
  iconNode: LucideIconNode,
  options: {
    cx: number;
    cy: number;
    size: number;
    color: string;
    strokeWidth: number;
  },
) {
  const scale = options.size / 24;
  ctx.save();
  ctx.translate(options.cx, options.cy);
  ctx.scale(scale, scale);
  ctx.translate(-12, -12);
  ctx.strokeStyle = options.color;
  ctx.fillStyle = options.color;
  ctx.lineWidth = options.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const [tag, attrs] of iconNode) {
    if (tag !== "path" || typeof attrs.d !== "string") {
      continue;
    }
    const path = new Path2D(attrs.d);
    const fill = attrs.fill;
    if (fill && fill !== "none") {
      ctx.fill(path);
    } else {
      ctx.stroke(path);
    }
  }

  ctx.restore();
}

/** Soft green badge colors for call / phone markers. */
export const PHONE_MARKER_COLORS: MarkerColors = {
  top: "#5dde7a",
  mid: "#34c759",
  bottom: "#248a3d",
};
