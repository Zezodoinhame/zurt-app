import { create } from 'zustand';
import type { ScenarioPreset, ScenarioResult, ScenarioType, AssetClass } from '../types';
import { demoScenarioPresets } from '../data/demo';

// Demo portfolio values per class
const PORTFOLIO_BY_CLASS: Record<AssetClass, { label: string; value: number; color: string }> = {
  fixedIncome:   { label: 'Renda Fixa',    value: 465000, color: '#3A86FF' },
  stocks:        { label: 'Ações',          value: 169400, color: '#00D4AA' },
  fiis:          { label: 'FIIs',           value: 101600, color: '#FFBE0B' },
  crypto:        { label: 'Cripto',         value: 42300,  color: '#F3BA2F' },
  international: { label: 'Internacional',  value: 33800,  color: '#A855F7' },
  pension:       { label: 'Previdência',    value: 35250,  color: '#F472B6' },
};

interface ScenarioState {
  presets: ScenarioPreset[];
  selectedType: ScenarioType | null;
  customChanges: Record<AssetClass, number>;
  result: ScenarioResult | null;

  loadPresets: () => void;
  selectPreset: (type: ScenarioType) => void;
  setCustomChange: (assetClass: AssetClass, pct: number) => void;
  applyScenario: () => void;
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  presets: [],
  selectedType: null,
  customChanges: { stocks: 0, fiis: 0, fixedIncome: 0, crypto: 0, international: 0, pension: 0 },
  result: null,

  loadPresets: () => set({ presets: demoScenarioPresets }),

  selectPreset: (type) => {
    const preset = get().presets.find((p) => p.type === type);
    if (preset && type !== 'custom') {
      set({ selectedType: type, customChanges: { ...preset.changes } });
    } else {
      set({ selectedType: type });
    }
  },

  setCustomChange: (assetClass, pct) => {
    set({ customChanges: { ...get().customChanges, [assetClass]: pct } });
  },

  applyScenario: () => {
    const { customChanges } = get();
    const classes = Object.keys(PORTFOLIO_BY_CLASS) as AssetClass[];
    let currentTotal = 0;
    let projectedTotal = 0;

    const perClass = classes.map((cls) => {
      const info = PORTFOLIO_BY_CLASS[cls];
      const changePct = customChanges[cls] ?? 0;
      const projected = Math.round(info.value * (1 + changePct / 100));
      currentTotal += info.value;
      projectedTotal += projected;
      return {
        class: cls,
        label: info.label,
        currentValue: info.value,
        projectedValue: projected,
        changePct,
        color: info.color,
      };
    });

    set({
      result: {
        currentValue: currentTotal,
        projectedValue: projectedTotal,
        totalChange: projectedTotal - currentTotal,
        totalChangePct: parseFloat(((projectedTotal / currentTotal - 1) * 100).toFixed(2)),
        perClass,
      },
    });
  },
}));
