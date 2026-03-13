"use client";
/**
 * COWORK.ARMY — useWorldSocket
 * WebSocket bağlantısı ve World event yönetimi
 * Desteklenen event tipleri: update, agent_message, external_trigger, cascade_event, cascade_complete
 */
import { useEffect, useRef, useState, useCallback } from "react";
import type {
  WorldEvent,
  AgentWorldModel,
  SchedulerStats,
} from "./world-types";

const MAX_EVENTS = 100;
const RECONNECT_DELAY_MS = 3000;

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface WorldState {
  events: WorldEvent[];
  worldModels: AgentWorldModel[];
  schedulerStats: SchedulerStats;
  connectionStatus: ConnectionStatus;
}

function getWsUrl(): string {
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  // Railway'de backend URL'i kullan, lokalde localhost:8888
  const backendHost =
    process.env.NEXT_PUBLIC_COWORK_WS_HOST ||
    (window.location.hostname === "localhost"
      ? "localhost:8888"
      : window.location.host.replace(/:\d+$/, ":8888"));
  return `${proto}//${backendHost}/ws/events`;
}

export function useWorldSocket(): WorldState {
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [worldModels, setWorldModels] = useState<AgentWorldModel[]>([]);
  const [schedulerStats, setSchedulerStats] = useState<SchedulerStats>({
    queue_size: 0,
    active_tasks: 0,
    active_agents: [],
  });
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    const url = getWsUrl();
    if (!url) return;

    setConnectionStatus("connecting");

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnectionStatus("connected");
      };

      ws.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(e.data);

          if (data.type === "update") {
            // Polling güncellemesi
            if (data.world_models) setWorldModels(data.world_models);
            if (data.scheduler_stats) setSchedulerStats(data.scheduler_stats);
            return;
          }

          // Event tipleri: agent_message, external_trigger, cascade_event, cascade_complete
          if (
            data.type === "agent_message" ||
            data.type === "external_trigger" ||
            data.type === "cascade_event" ||
            data.type === "cascade_complete"
          ) {
            setEvents((prev) => {
              const next = [data as WorldEvent, ...prev];
              return next.slice(0, MAX_EVENTS);
            });
          }
        } catch {
          // JSON parse hatası — yoksay
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnectionStatus("disconnected");
        wsRef.current = null;
        // Otomatik yeniden bağlan
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setConnectionStatus("error");
        ws.close();
      };
    } catch {
      setConnectionStatus("error");
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, RECONNECT_DELAY_MS);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { events, worldModels, schedulerStats, connectionStatus };
}
