"use client";
/**
 * COWORK.ARMY — CityCanvas
 * HTML5 Canvas 2D izometrik şehir haritası
 * 5 departman binası, mesaj parçacıkları, cascade dalgaları
 */
import { useRef, useEffect, useCallback } from "react";
import type { WorldEvent, AgentWorldModel, Department } from "@/lib/world-types";
import { DEPT_CONFIG, getAgentDepartment } from "@/lib/world-types";
import {
  drawBuilding,
  getBuildingCenter,
  type BuildingState,
} from "./canvas/BuildingRenderer";
import {
  createParticle,
  updateParticle,
  drawParticle,
  type Particle,
} from "./canvas/MessageParticle";
import {
  createWave,
  updateWave,
  drawWave,
  type Wave,
} from "./canvas/CascadeWave";

interface Props {
  events: WorldEvent[];
  worldModels: AgentWorldModel[];
}

const DEPTS: Department[] = ["trade", "medical", "hotel", "software", "bots"];

export default function CityCanvas({ events, worldModels }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const wavesRef = useRef<Wave[]>([]);
  const buildingStatesRef = useRef<Map<Department, BuildingState>>(new Map());
  const lastEventCountRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  // Bina durumlarını world models'a göre güncelle
  useEffect(() => {
    for (const dept of DEPTS) {
      const agentsInDept = worldModels.filter(
        (m) => getAgentDepartment(m.agent_id) === dept
      );
      const activeCount = agentsInDept.filter((m) => m.current_task).length;
      const existing = buildingStatesRef.current.get(dept);
      buildingStatesRef.current.set(dept, {
        department: dept,
        agentCount: agentsInDept.length || 3,
        activeAgents: activeCount,
        glowIntensity: existing?.glowIntensity ?? (activeCount > 0 ? 0.6 : 0.15),
        pulseCount: existing?.pulseCount ?? 0,
      });
    }
  }, [worldModels]);

  // Yeni event'lere göre animasyon tetikle
  useEffect(() => {
    if (events.length === lastEventCountRef.current) return;
    lastEventCountRef.current = events.length;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const latestEvent = events[0];
    if (!latestEvent) return;

    if (latestEvent.type === "agent_message") {
      const fromDept = getAgentDepartment(latestEvent.from_agent);
      const toDept = getAgentDepartment(latestEvent.to_agent);

      if (fromDept && toDept && fromDept !== toDept) {
        const from = getBuildingCenter(fromDept, canvas.offsetWidth, canvas.offsetHeight);
        const to = getBuildingCenter(toDept, canvas.offsetWidth, canvas.offsetHeight);
        const color = DEPT_CONFIG[fromDept].color;

        // Maksimum 8 parçacık aynı anda
        if (particlesRef.current.length < 8) {
          particlesRef.current.push(
            createParticle(
              latestEvent.id,
              from.x,
              from.y,
              to.x,
              to.y,
              color,
              latestEvent.priority,
              latestEvent.payload_summary
            )
          );
        }

        // Kaynak bina parıltısı
        const state = buildingStatesRef.current.get(fromDept);
        if (state) state.glowIntensity = 1.0;
      }
    }

    if (latestEvent.type === "external_trigger") {
      const targetDepts = (latestEvent as { target_departments: string[] }).target_departments;
      for (const dept of targetDepts as Department[]) {
        if (!DEPT_CONFIG[dept]) continue;
        const center = getBuildingCenter(dept, canvas.offsetWidth, canvas.offsetHeight);
        const color = DEPT_CONFIG[dept].color;
        wavesRef.current.push(
          createWave(`wave-${Date.now()}-${dept}`, center.x, center.y, color, 3)
        );

        const state = buildingStatesRef.current.get(dept);
        if (state) {
          state.glowIntensity = 1.0;
          state.pulseCount = 3;
        }
      }
    }

    if (latestEvent.type === "cascade_complete" || latestEvent.type === "cascade_event") {
      const affectedDepts = (latestEvent as { affected_departments: string[] }).affected_departments || [];
      for (const dept of affectedDepts as Department[]) {
        if (!DEPT_CONFIG[dept]) continue;
        const center = getBuildingCenter(dept, canvas.offsetWidth, canvas.offsetHeight);
        wavesRef.current.push(
          createWave(`cascade-${Date.now()}-${dept}`, center.x, center.y, "#aa00ff", 2)
        );
      }
    }
  }, [events]);

  // Ana render döngüsü
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas boyutunu güncelle (resize handling)
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // Arka plan
    ctx.fillStyle = "#060710";
    ctx.fillRect(0, 0, w, h);

    // Grid çizgileri (çok hafif)
    ctx.strokeStyle = "#ffffff06";
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Bağlantı çizgileri (binalar arası ince çizgi)
    drawConnectionLines(ctx, w, h);

    // Binalar
    for (const dept of DEPTS) {
      const state = buildingStatesRef.current.get(dept);
      if (!state) continue;
      drawBuilding(ctx, state, w, h);
      // Glow'u zamanla azalt
      if (state.glowIntensity > 0.15) {
        state.glowIntensity = Math.max(0.15, state.glowIntensity - 0.008);
      }
    }

    // Cascade dalgaları
    wavesRef.current = wavesRef.current.filter((w) => {
      drawWave(ctx, w);
      return updateWave(w);
    });

    // Mesaj parçacıkları
    particlesRef.current = particlesRef.current.filter((p) => {
      drawParticle(ctx, p);
      return updateParticle(p);
    });

    animFrameRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}

function drawConnectionLines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  const connections: [Department, Department][] = [
    ["trade", "software"],
    ["trade", "medical"],
    ["medical", "hotel"],
    ["software", "bots"],
    ["hotel", "bots"],
    ["trade", "hotel"],
  ];

  ctx.save();
  ctx.strokeStyle = "#ffffff08";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);

  for (const [a, b] of connections) {
    const from = getBuildingCenter(a, w, h);
    const to = getBuildingCenter(b, w, h);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}
