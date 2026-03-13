/**
 * COWORK.ARMY — CascadeWave
 * Dış tetikleyici veya cascade olayında yayılan dalga animasyonu
 */

export interface Wave {
  id: string;
  centerX: number;
  centerY: number;
  color: string;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
  rings: number;  // Kaç halka çizilecek
}

export function createWave(
  id: string,
  centerX: number,
  centerY: number,
  color: string,
  rings: number = 3
): Wave {
  return {
    id,
    centerX,
    centerY,
    color,
    radius: 0,
    maxRadius: 130,
    startTime: Date.now(),
    duration: 1400,
    rings,
  };
}

export function updateWave(w: Wave): boolean {
  const elapsed = Date.now() - w.startTime;
  const progress = elapsed / w.duration;
  w.radius = w.maxRadius * progress;
  return progress < 1;
}

export function drawWave(ctx: CanvasRenderingContext2D, w: Wave): void {
  const elapsed = Date.now() - w.startTime;
  const progress = elapsed / w.duration;

  ctx.save();

  for (let ring = 0; ring < w.rings; ring++) {
    const ringOffset = ring / w.rings;
    const ringProgress = Math.max(0, progress - ringOffset);
    if (ringProgress <= 0) continue;

    const radius = w.maxRadius * ringProgress;
    const alpha = (1 - ringProgress) * 0.7;

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = w.color;
    ctx.lineWidth = 2 - ring * 0.5;
    ctx.shadowColor = w.color;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.arc(w.centerX, w.centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
