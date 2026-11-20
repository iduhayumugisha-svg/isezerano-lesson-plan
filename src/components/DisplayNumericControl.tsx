import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface DisplayNumericControlProps {
  id: string;
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (nextValue: number) => void;
}

export const DisplayNumericControl: React.FC<DisplayNumericControlProps> = ({
  id,
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange
}) => {
  const clamp = (raw: number) => Math.min(max, Math.max(min, Math.round(raw)));

  const handleDecrement = () => {
    onChange(clamp(value - step));
  };

  const handleIncrement = () => {
    onChange(clamp(value + step));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(e.target.value);
    if (!Number.isFinite(parsed)) return;
    onChange(clamp(parsed));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <label htmlFor={id} className="block text-xs font-bold text-slate-900">
            {label}
          </label>
          {description && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{description}</p>
          )}
        </div>
        <span className="text-xs font-mono font-bold text-slate-700 tabular-nums shrink-0">
          {value}
          {unit}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="flex-1 min-w-0 accent-teal-700 cursor-pointer h-2"
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shrink-0">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleNumberChange}
            aria-label={`${label} numeric value (${unit})`}
            className="w-16 px-2 py-1.5 text-xs font-mono font-bold text-slate-900 tabular-nums text-right focus:outline-none"
          />
          <span className="px-1.5 py-1.5 text-[11px] font-mono text-slate-500 bg-slate-100 border-l border-slate-200 select-none">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
};
