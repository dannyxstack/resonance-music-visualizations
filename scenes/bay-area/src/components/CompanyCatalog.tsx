import { companies } from "../config/companies";
import type { MotionType } from "../types/company";

interface CompanyCatalogProps {
  open: boolean;
  positions: Record<string, { x: number; y: number }>;
}

const actionLabels: Record<MotionType, string> = {
  breath: "呼吸/缩放",
  pulse: "闪烁/脉冲",
  glow: "发光",
  shake: "振动",
  orbit: "光环旋转",
  spin: "Logo旋转",
  ripple: "涟漪",
  beatJump: "节拍跳动",
  beatSideStep: "节拍左右跳",
  beatTilt: "节拍左右摆",
  beatGrow: "节拍底盘放大",
  beatLogoGrow: "节拍Logo放大",
  beatShape: "节拍4/6/8/圆变形",
};

export function CompanyCatalog({ open, positions }: CompanyCatalogProps): React.ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <aside className="company-catalog is-open" aria-label="Company logo catalog">
      <div id="company-catalog-panel" className="catalog-panel">
        <div className="catalog-header">
          <span>Logo</span>
          <span>Company</span>
          <span>XY</span>
          <span>Action</span>
        </div>
        <div className="catalog-list">
          {companies.map((company) => {
            const position = positions[company.id] ?? {
              x: Math.round(window.innerWidth * company.x),
              y: Math.round(window.innerHeight * company.y),
            };

            return (
              <div className="catalog-row" key={company.id}>
                <span className="catalog-logo">
                  {company.logo ? <img src={company.logo} alt="" draggable={false} /> : company.fallbackLabel}
                </span>
                <span className="catalog-name">{company.name}</span>
                <span className="catalog-coords">
                  {position.x}, {position.y}
                </span>
                <span className="catalog-action">{actionLabels[company.motion]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
