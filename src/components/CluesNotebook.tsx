import React from 'react';
import { X, CheckCircle2, Lock, Sparkles, Compass, Mic, Camera, Vibrate } from 'lucide-react';
import { ClueItem } from '../types';

interface CluesNotebookProps {
  clues: ClueItem[];
  isOpen: boolean;
  onClose: () => void;
  onGoToDoor: () => void;
}

export const CluesNotebook: React.FC<CluesNotebookProps> = ({
  clues,
  isOpen,
  onClose,
  onGoToDoor,
}) => {
  if (!isOpen) return null;

  const revealedCount = clues.filter((c) => c.revealed).length;
  const isComplete = revealedCount === clues.length;

  const getSensorIcon = (sensor: string) => {
    switch (sensor) {
      case 'Giroscopio':
        return <Compass className="w-4 h-4 text-orange-400" />;
      case 'Micrófono':
        return <Mic className="w-4 h-4 text-emerald-400" />;
      case 'Cámara WebRTC':
        return <Camera className="w-4 h-4 text-sky-400" />;
      case 'Táctil y Háptico':
        return <Vibrate className="w-4 h-4 text-purple-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border-2 border-orange-500/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl">📓</span>
            <div>
              <h2 className="font-display text-lg font-bold">Cuaderno de Pistas del Alumno</h2>
              <p className="text-xs text-orange-100">Expediente de Navegación Sensorial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-black/20 hover:bg-black/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-neutral-950 px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono">Progreso de Pistas:</span>
            <span className="text-xs font-bold font-mono text-orange-400">
              {revealedCount} / {clues.length}
            </span>
          </div>
          <div className="w-36 h-2.5 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
              style={{ width: `${(revealedCount / clues.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Clues List */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {clues.map((clue) => (
            <div
              key={clue.id}
              className={`p-3.5 rounded-xl border transition-all ${
                clue.revealed
                  ? 'bg-neutral-800/90 border-neutral-700 shadow-md'
                  : 'bg-neutral-950/60 border-neutral-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {getSensorIcon(clue.sensor)}
                  <h4 className="font-display text-sm font-semibold text-white">
                    {clue.title}
                  </h4>
                </div>
                {clue.revealed ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Descifrado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-neutral-500 font-mono bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                    <Lock className="w-3.5 h-3.5" />
                    Bloqueado
                  </span>
                )}
              </div>

              <div className="text-xs text-neutral-400 mb-1 flex items-center gap-2">
                <span>Fuente: <strong className="text-neutral-300">{clue.source}</strong></span>
                <span>•</span>
                <span>Sensor: <strong className="text-orange-400">{clue.sensor}</strong></span>
              </div>

              {clue.revealed ? (
                <p className="text-xs text-amber-200/90 bg-neutral-950/80 p-2.5 rounded-lg border border-amber-900/40 italic font-mono">
                  "{clue.text}"
                </p>
              ) : (
                <p className="text-xs text-neutral-500 italic">
                  Pista oculta: {clue.hint}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-neutral-950 p-4 border-t border-neutral-800 flex items-center justify-between">
          <p className="text-[11px] text-neutral-400">
            {isComplete
              ? '¡Tienes todas las pistas! Dirígete a la Puerta 404.'
              : 'Interactúa con los NPCs en el pasillo usando tus sensores.'}
          </p>
          <button
            onClick={() => {
              onClose();
              onGoToDoor();
            }}
            className={`px-4 py-2 rounded-lg text-xs font-display transition-all cursor-pointer ${
              isComplete
                ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold shadow-lg animate-bounce'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
            }`}
          >
            Ir a la Puerta 404 ➔
          </button>
        </div>
      </div>
    </div>
  );
};
