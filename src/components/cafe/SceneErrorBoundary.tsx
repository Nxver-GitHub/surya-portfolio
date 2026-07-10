"use client";

import { Component, type ReactNode } from "react";

interface SceneErrorBoundaryProps {
  /** Rendered when the wrapped 3D subtree throws (e.g. a missing glb). */
  fallback: ReactNode;
  children: ReactNode;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render/load failures in the 3D café subtree (most importantly a
 * missing or malformed cafe.glb) and swaps in the styled 2D backdrop. Keeping
 * this at the boundary means a failed scene never takes down the Menu Book UI
 * beside it. Suspense handles the pending state; this handles the failure one.
 */
export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
