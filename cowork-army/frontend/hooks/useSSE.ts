import { useEffect, useRef } from "react"

export interface SSEEvent {
  event: string
  data: Record<string, unknown>
}

interface UseSSEOptions {
  url: string
  onEvent: (event: SSEEvent) => void
  enabled?: boolean
}

export function useSSE({ url, onEvent, enabled = true }: UseSSEOptions): { connected: boolean } {
  const onEventRef = useRef(onEvent)
  const connectedRef = useRef(false)

  useEffect(() => { onEventRef.current = onEvent }, [onEvent])

  useEffect(() => {
    if (!enabled) return
    const es = new EventSource(url)
    es.onopen = () => { connectedRef.current = true }
    es.onerror = () => { connectedRef.current = false }

    const handle = (e: MessageEvent) => {
      try {
        onEventRef.current({ event: e.type, data: JSON.parse(e.data) })
      } catch {}
    }

    for (const t of ["agent_event", "agent_status", "task_update", "system_health", "budget_warning", "connected", "heartbeat"]) {
      es.addEventListener(t, handle)
    }
    return () => { es.close(); connectedRef.current = false }
  }, [url, enabled])

  return { connected: connectedRef.current }
}
