"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { Html, useGLTF } from "@react-three/drei";
import type { Exhibit } from "../../../content/cafe-exhibits";

/**
 * Per-exhibit error boundary. A missing or malformed exhibit glb throws from its
 * Suspense-driven loader; catching it HERE (one boundary per piece) keeps the
 * failure local — the café scene and every other exhibit stay up. On failure it
 * renders nothing and reports unavailability once, so the UI lists only live
 * pieces.
 */
class ExhibitErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

interface ExhibitPieceProps {
  exhibit: Exhibit;
  isActive: boolean;
  hovered: boolean;
  onSelect: (exhibit: Exhibit) => void;
  onHoverChange: (exhibit: Exhibit, hovered: boolean) => void;
  /** Reports whether this piece's glb loaded (true) or failed (false). */
  onAvailability: (exhibit: Exhibit, available: boolean) => void;
}

/** Loads the exhibit's glb and mounts it at its transform. Suspends while
 * loading and throws to the boundary on failure — never rendered directly. */
function ExhibitModel({
  exhibit,
  isActive,
  hovered,
  onSelect,
  onHoverChange,
  onAvailability,
}: ExhibitPieceProps) {
  // Throws to ExhibitErrorBoundary if the glb is absent/malformed.
  const { scene } = useGLTF(exhibit.modelPath);

  // Clone so multiple exhibits (or a remount) never share one scene graph.
  const object = useMemo(() => scene.clone(true), [scene]);

  // A successful load means this piece is available — report once per exhibit.
  useEffect(() => {
    onAvailability(exhibit, true);
  }, [exhibit, onAvailability]);

  const { position, rotationY, scale } = exhibit.mount;
  const lit = isActive || hovered;

  return (
    <group
      position={[position[0], position[1], position[2]]}
      rotation={[0, rotationY, 0]}
      scale={scale ?? 1}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(exhibit);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHoverChange(exhibit, true);
      }}
      onPointerOut={() => onHoverChange(exhibit, false)}
    >
      <primitive object={object} />
      {lit ? (
        <Html
          center
          distanceFactor={6}
          position={[0, 0.6, 0]}
          zIndexRange={[20, 0]}
        >
          <div
            style={{
              transform: "translateY(-100%)",
              whiteSpace: "nowrap",
              background: "#0a0a0b",
              border: "2px solid #ef8100",
              boxShadow: "2px 3px 0 rgba(0,0,0,0.7)",
              padding: "4px 8px",
              pointerEvents: "none",
              fontFamily: "var(--font-display, sans-serif)",
              textTransform: "uppercase",
              color: "#e6e6e6",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {exhibit.name}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

/**
 * A single museum exhibit in the café scene. Lazily loads its own glb inside its
 * OWN Suspense + error boundary, so a missing/broken piece never takes down the
 * café or its neighbours — it just doesn't render, and reports availability up
 * so the "On display" UI lists only live pieces. Clickable → drives exhibit
 * focus; hover/focus raises an HTML name label.
 */
export function ExhibitPiece(props: ExhibitPieceProps): ReactNode {
  const { exhibit, onAvailability } = props;
  return (
    <ExhibitErrorBoundary onError={() => onAvailability(exhibit, false)}>
      <Suspense fallback={null}>
        <ExhibitModel {...props} />
      </Suspense>
    </ExhibitErrorBoundary>
  );
}
