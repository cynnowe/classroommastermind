import React from 'react';
import type { Layout, GridCell, CellType } from '../types';
import { User, Monitor, DoorOpen, Wind, Trash2, Plus, Minus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  layout: Layout;
  onChange: (layout: Layout) => void;
}

const CELL_TYPES: { type: CellType, label: string, icon: any, color: string }[] = [
  { type: 'seat', label: 'Place élève', icon: User, color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { type: 'desk', label: 'Bureau Prof', icon: Monitor, color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
  { type: 'window', label: 'Fenêtre', icon: Wind, color: 'bg-sky-100 border-sky-300 text-sky-700' },
  { type: 'door', label: 'Porte', icon: DoorOpen, color: 'bg-amber-100 border-amber-300 text-amber-700' },
];

export const LayoutEditor: React.FC<Props> = ({ layout, onChange }) => {
  const [activeTool, setActiveTool] = React.useState<CellType>('seat');
  const [isMouseDown, setIsMouseDown] = React.useState(false);

  const applyTool = (row: number, col: number, forceRemove: boolean = false) => {
    const key = `${row}-${col}`;
    const current = layout.grid_config.cells[key];
    const newCells = { ...layout.grid_config.cells };

    if (forceRemove || (current && current.type === activeTool)) {
      delete newCells[key];
    } else {
      newCells[key] = { type: activeTool, row, col };
    }

    onChange({
      ...layout,
      grid_config: { ...layout.grid_config, cells: newCells }
    });
  };

  const updateSize = (dim: 'rows' | 'cols', delta: number) => {
    const newVal = Math.max(1, layout.grid_config[dim] + delta);
    onChange({
      ...layout,
      grid_config: { ...layout.grid_config, [dim]: newVal }
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800" onMouseUp={() => setIsMouseDown(false)} onMouseLeave={() => setIsMouseDown(false)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Éditeur de Salle</h2>
          <p className="text-xs text-zinc-500 mt-1">Sélectionnez un outil puis peignez sur la grille.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-zinc-400 px-2">Grille</span>
            <div className="flex items-center border-l border-zinc-200 dark:border-zinc-700 ml-1 pl-1">
              <button onClick={() => updateSize('rows', -1)} className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded shadow-sm"><Minus className="w-4 h-4" /></button>
              <span className="w-8 text-center text-xs font-bold">{layout.grid_config.rows} L</span>
              <button onClick={() => updateSize('rows', 1)} className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded shadow-sm"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center border-l border-zinc-200 dark:border-zinc-700 ml-1 pl-1">
              <button onClick={() => updateSize('cols', -1)} className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded shadow-sm"><Minus className="w-4 h-4" /></button>
              <span className="w-8 text-center text-xs font-bold">{layout.grid_config.cols} C</span>
              <button onClick={() => updateSize('cols', 1)} className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded shadow-sm"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
          <button 
            onClick={() => onChange({ ...layout, grid_config: { ...layout.grid_config, cells: {} } })}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors border border-red-200"
          >
            <Trash2 className="w-4 h-4" /> Vider
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        {CELL_TYPES.map(ct => (
          <button 
            key={ct.type}
            onClick={() => setActiveTool(ct.type)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2",
              activeTool === ct.type 
                ? cn("shadow-lg scale-105", ct.color)
                : "bg-white dark:bg-zinc-900 border-transparent text-zinc-500 hover:border-zinc-200"
            )}
          >
            <ct.icon className={cn("w-5 h-5", activeTool === ct.type ? "animate-pulse" : "")} />
            {ct.label}
          </button>
        ))}
        <button 
            onClick={() => onChange({ ...layout, grid_config: { ...layout.grid_config, cells: {} } })}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 bg-white dark:bg-zinc-900 border-transparent text-red-500 hover:border-red-200"
            )}
          >
            <Trash2 className="w-5 h-5" /> Effacer tout
        </button>
      </div>

      <div 
        className="grid gap-1.5 p-6 bg-zinc-100 dark:bg-zinc-900/50 rounded-3xl overflow-auto max-h-[650px] border-4 border-zinc-200 dark:border-zinc-800 shadow-inner"
        style={{ 
          gridTemplateColumns: `repeat(${layout.grid_config.cols}, minmax(48px, 1fr))`,
          width: 'fit-content',
          margin: '0 auto'
        }}
      >
        {Array.from({ length: layout.grid_config.rows }).map((_, r) => (
          Array.from({ length: layout.grid_config.cols }).map((_, c) => {
            const key = `${r}-${c}`;
            const cell = layout.grid_config.cells[key];
            const cellType = CELL_TYPES.find(ct => ct.type === cell?.type);

            return (
              <button
                key={key}
                onMouseDown={() => { setIsMouseDown(true); applyTool(r, c); }}
                onMouseEnter={() => { if (isMouseDown) applyTool(r, c); }}
                className={cn(
                  "w-14 h-14 rounded-xl border-2 transition-all flex items-center justify-center group relative shadow-sm",
                  cell ? cellType?.color : "border-zinc-100 dark:border-zinc-800/50 hover:border-indigo-300 dark:hover:border-indigo-800 bg-zinc-50/50 dark:bg-zinc-900/30"
                )}
              >
                {cell && cellType && <cellType.icon className="w-7 h-7" />}
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 text-white px-1 rounded whitespace-nowrap z-10 pointer-events-none">
                  Rang {r+1}, Col {c+1}
                </span>
              </button>
            );
          })
        ))}
      </div>
    </div>
  );
};
