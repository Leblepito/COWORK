/**
 * COWORK.ARMY — MessageParticle
 * Agent'lar arası mesaj animasyonu (bezier eğrisi üzerinde hareket eden parçacık)
 */

export interface Particle {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  progress: number;  // 0-1
  duration: number;  // ms
  startTime: number;
  priority: string;
  label: string;     // kısa mesaj özeti
}

export function createParticle(
  id: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  priority: string,
  label: string = ""
): Particle {
  const durationMap: Record<string, number> = {
    CRITICAL: 400,
    HIGH: 600,
    MEDIUM: 800,
    LOW: 1000,
  };
  return {
    id,
    fromX,
    fromY,
    toX,
    toY,
    color,
    priority,
    label: label.slice(0, 30),
    progress: 0,
    duration: durationMap[priority] || 800,
    startTime: Date.now(),
  };
}

export function updateParticle(p: Particle): boolean {
  const elapsed = Date.now() - p.startTime;
  p.progress = Math.min(1, elapsed / p.duration);
  return p.progress < 1;
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const t = easeInOut(p.progress);

  // Bezier eğrisi: kontrol noktası yukarıda (binalar arası yay)
  const midX = (p.fromX + p.toX) / 2;
  const midY = Math.min(p.fromY, p.toY) - 70;

  const x = bezier(p.fromX, midX, p.toX, t);
  const y = bezier(p.fromY, midY, p.toY, t);

  const sizeMap: Record<string, number> = {
    CRITICAL: 9,
    HIGH: 7,
    MEDIUM: 5,
    LOW: 4,
  };
  const size = sizeMap[p.priority] || 5;

  ctx.save();

  // Iz çizgisi (son 5 pozisyon)
  const trailLength = 5;
  for (let i = 1; i <= trailLength; i++) {
    const trailT = easeInOut(Math.max(0, p.progress - (i * 0.03)));
    const tx = bezier(p.fromX, midX, p.toX, trailT);
    const ty = bezier(p.fromY, midY, p.toY, trailT);
    const alpha = (1 - i / trailLength) * 0.3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(tx, ty, size * (1 - i / trailLength / 2), 0, Math.PI * 2);
    ctx.fill();
  }

  // Ana parçacık
  ctx.globalAlpha = 1;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Parçacık etrafında halka
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, size + 3, 0, Math.PI * 2);
  ctx.stroke();

  // Hedefe ulaşınca parlama
  if (p.progress > 0.9) {
    const alpha = (1 - p.progress) * 10;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.shadowBlur = 30;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.toX, p.toY, 18 * (p.progress - 0.9) * 10, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function bezier(p0: number, p1: number, p2: number, t: number): number {
  return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
