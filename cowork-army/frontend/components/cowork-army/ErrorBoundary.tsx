"use client"
import { Component, ReactNode } from "react"

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "#060710", color: "#ef4444", flexDirection: "column", gap: "1rem", padding: "2rem" }}>
          <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>3D Scene Error</p>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>{this.state.error?.message ?? "Unknown error"}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} style={{ padding: "0.5rem 1rem", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "0.5rem", cursor: "pointer" }}>Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}
