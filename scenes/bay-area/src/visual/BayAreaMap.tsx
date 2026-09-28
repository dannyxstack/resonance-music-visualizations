import bayAreaBackground from "../assets/map/bay-area-background.png";
import type { CSSProperties } from "react";

interface BayAreaMapProps {
  rms: number;
  bass: number;
}

export function BayAreaMap({ rms, bass }: BayAreaMapProps): React.ReactElement {
  return (
    <div
      className="bay-map bay-map-image"
      style={{
        "--map-rms": rms,
        "--map-bass": bass,
      } as CSSProperties}
      aria-hidden="true"
    >
      <img src={bayAreaBackground} alt="" draggable={false} />
    </div>
  );
}
