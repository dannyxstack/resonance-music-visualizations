import type { TempoProgress } from "../types/tempo";
import { BPM_METHODS, ENERGY_METHODS } from "../../../../public/visualizers/shared/analysis.js";

interface AudioControlsProps {
  fileName: string | null;
  intensity: number;
  catalogOpen: boolean;
  tempoProgress: TempoProgress | null;
  bpmMethod: string;
  energyMethod: string;
  onIntensity: (value: number) => void;
  onBpmMethod: (method: string) => void;
  onEnergyMethod: (method: string) => void;
  onReanalyze: () => void;
  onToggleCatalog: () => void;
}

export function AudioControls({ fileName, intensity, catalogOpen, tempoProgress, bpmMethod,
  energyMethod, onIntensity, onBpmMethod, onEnergyMethod, onReanalyze,
  onToggleCatalog }: AudioControlsProps): React.ReactElement {
  return <section className="controls parameter-controls" aria-label="Visualization parameters">
    <h2>画面参数</h2>
    <label className="bpm-method-control"><span>预分析方法</span><select value={bpmMethod} onChange={event => onBpmMethod(event.currentTarget.value)}>{BPM_METHODS.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
    <button type="button" className="bpm-reanalyze" onClick={onReanalyze} disabled={!fileName || Boolean(tempoProgress)}>重新分析 BPM</button>
    <label className="bpm-method-control"><span>节点能量方法</span><select value={energyMethod} onChange={event => onEnergyMethod(event.currentTarget.value)}>{ENERGY_METHODS.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
    <label className="intensity-control"><span>画面能量</span><input type="range" min="0.25" max="1.2" step="0.01" value={intensity} onChange={event => onIntensity(Number(event.currentTarget.value))} aria-label="Master visualization intensity" /></label>
    <button type="button" className="catalog-icon-button" onClick={onToggleCatalog} aria-label={catalogOpen ? "Close company catalog" : "Open company catalog"} aria-expanded={catalogOpen} aria-controls="company-catalog-panel">{catalogOpen ? '收起公司目录' : '打开公司目录'}</button>
  </section>;
}
