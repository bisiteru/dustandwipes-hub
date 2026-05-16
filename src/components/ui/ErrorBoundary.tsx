// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Error boundary
//  Phase 3 extraction. Wraps each page module so a render error in one
//  module doesn't take down the entire app.
// ─────────────────────────────────────────────────────────────────────────────

import React, { Component, ReactNode, ErrorInfo } from "react";
import { G } from "../../lib/constants";
import { captureException } from "../../lib/sentry";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Friendly name of the module, shown in the fallback ("Site Reports", etc.). */
  module?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    // Forward to Sentry with the module name so we can group / filter by page.
    // No-op when Sentry isn't initialized (dev, or DSN unset).
    captureException(error, {
      module: this.props.module || "unknown",
      componentStack: info.componentStack,
    });
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    const { module = "this module" } = this.props;
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{ background: "#fee2e2" }}>⚠️</div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">{module} encountered an error</h2>
        <p className="text-sm text-gray-500 mb-1 max-w-sm">
          Something went wrong while rendering {module}. Your data is safe — this is a display error only.
        </p>
        {this.state.error && (
          <p className="text-xs font-mono text-red-500 bg-red-50 rounded-lg px-4 py-2 mb-4 max-w-sm break-all">
            {this.state.error.message}
          </p>
        )}
        <button onClick={this.reset}
          className="px-6 py-2 rounded-xl text-white text-sm font-bold"
          style={{ background: G }}>
          Try Again
        </button>
      </div>
    );
  }
}
