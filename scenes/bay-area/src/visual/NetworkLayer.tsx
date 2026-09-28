import type { AudioFeatures } from "../types/audio";
import type { CompanyNodeConfig, EntityConnection } from "../types/company";

interface NetworkLayerProps {
  companies: CompanyNodeConfig[];
  connections: EntityConnection[];
  features: AudioFeatures;
}

export function NetworkLayer({ companies, connections, features }: NetworkLayerProps): React.ReactElement {
  const byId = new Map(companies.map((company) => [company.id, company]));

  return (
    <svg className="network-layer" viewBox="0 0 1000 800" aria-hidden="true">
      <defs>
        <linearGradient id="packetGradient" x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#d9f0ff" stopOpacity={0.5 + features.high * 0.35} />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {connections.map((connection) => {
        const from = byId.get(connection.from);
        const to = byId.get(connection.to);
        if (!from || !to) {
          return null;
        }

        const x1 = from.x * 1000;
        const y1 = from.y * 800;
        const x2 = to.x * 1000;
        const y2 = to.y * 800;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - 48 * connection.strength;
        const path = `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
        const activity = Math.min(1, features.high * 0.8 + features.onset * 0.55);

        return (
          <g key={`${connection.from}-${connection.to}`}>
            <path
              className="connection-line"
              d={path}
              style={{
                opacity: 0.08 + connection.strength * 0.12 + activity * 0.22,
                strokeWidth: 0.8 + connection.strength * 1.4,
              }}
            />
            <path
              className="connection-packet"
              d={path}
              pathLength={1}
              style={{
                opacity: activity * connection.strength,
                strokeDasharray: "0.04 0.96",
                animationDuration: `${2.8 - connection.strength * 1.1}s`,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}
