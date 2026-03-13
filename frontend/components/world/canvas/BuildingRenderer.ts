/**
 * COWORK.ARMY — BuildingRenderer
 * Canvas 2D izometrik bina çizimi
 */
import { DEPT_CONFIG, type Department } from "@/lib/world-types";

export interface BuildingState {
  department: Department;
  agentCount: number;
  activeAgents: number;
  glowIntensity: number;  // 0-1, animasyon için
  pulseCount: number;     // cascade pulse sayacı
}

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  state: BuildingState,
  canvasWidth: number,
  canvasHeight: number
): void {
  const cfg = DEPT_CONFIG[state.department];
  const cx = (cfg.position.x / 100) * canvasWidth;
  const cy = (cfg.position.y / 100) * canvasHeight;

  const baseW = Math.max(90, 90 + state.agentCount * 4);
  const baseH = Math.max(70, 70 + state.agentCount * 3);

  ctx.save();

  // Glow efekti
  if (state.glowIntensity > 0.1) {
    ctx.shadowColor = cfg.color;
    ctx.shadowBlur = 24 * state.glowIntensity;
  }

  // Bina gövdesi
  ctx.fillStyle = cfg.bgColor;
  ctx.strokeStyle = cfg.color;
  ctx.lineWidth = state.glowIntensity > 0.5 ? 2.5 : 1.5;

  ctx.beginPath();
  ctx.roundRect(cx - baseW / 2, cy - baseH / 2, baseW, baseH, 10);
  ctx.fill();
  ctx.stroke();

  // Çatı çizgisi
  ctx.shadowBlur = 0;
  ctx.strokeStyle = cfg.color + "55";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - baseW / 2 + 10, cy - baseH / 2 + 18);
  ctx.lineTo(cx + baseW / 2 - 10, cy - baseH / 2 + 18);
  ctx.stroke();

  // Departman ikonu
  ctx.font = "22px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cfg.icon, cx, cy - 12);

  // Departman adı
  ctx.font = "bold 10px 'JetBrains Mono', monospace";
  ctx.fillStyle = cfg.color;
  ctx.shadowColor = cfg.color;
  ctx.shadowBlur = state.glowIntensity > 0.3 ? 6 : 0;
  ctx.fillText(cfg.label.toUpperCase(), cx, cy + 8);

  // Agent sayısı
  ctx.font = "9px monospace";
  ctx.fillStyle = cfg.color + "99";
  ctx.shadowBlur = 0;
  const actLabel = state.activeAgents > 0
    ? `${state.activeAgents} aktif / ${state.agentCount}`
    : `${state.agentCount} agent`;
  ctx.fillText(actLabel, cx, cy + 22);

  // Aktif görev göstergesi (yeşil nokta)
  if (state.activeAgents > 0) {
    ctx.fillStyle = "#00ff88";
    ctx.shadowColor = "#00ff88";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx + baseW / 2 - 10, cy - baseH / 2 + 10, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function getBuildingCenter(
  department: Department,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const cfg = DEPT_CONFIG[department];
  return {
    x: (cfg.position.x / 100) * canvasWidth,
    y: (cfg.position.y / 100) * canvasHeight,
  };
}
