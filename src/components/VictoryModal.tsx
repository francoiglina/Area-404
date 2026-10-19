import React from 'react';
import { Award, Sparkles, RotateCcw, Eye, Compass, Mic, Camera, Vibrate } from 'lucide-react';
import { sensorManager } from '../services/sensorManager';
import { audioSynth } from '../services/audioSynth';

interface VictoryModalProps {
  isOpen: boolean;
  onExplore: () => void;
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onExplore,
  onRestart,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-300">
      <div className="bg-neutral-900 border-2 border-amber-500 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 rounded-b-full shadow-lg shadow-amber-500/50" />

        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 text-4xl mb-4 shadow-inner animate-pulse">
          🏆
        </div>

        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-wide mb-1">
          ¡AULA 404 ENCONTRADA!
        </h2>
        <p className="text-xs font-mono uppercase text-neutral-300 tracking-wider mb-4">
          Misión Sensorial Cumplida con Éxito
        </p>

        {/* Report Card */}
        <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 text-left mb-5 space-y-2.5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="text-xs text-neutral-400 font-mono">Calificación Final:</span>
            <span className="font-display font-bold text-amber-400 text-sm">SOBRESALIENTE (10/10)</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-orange-400" />
                Giroscopio Cenital:
              </span>
              <span className="text-emerald-400 font-mono font-bold">Alineado ✓</span>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                Micrófono Resonante:
              </span>
              <span className="text-emerald-400 font-mono font-bold">Desbloqueado ✓</span>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                Cámara / Espejo AR:
              </span>
              <span className="text-emerald-400 font-mono font-bold">Verificado ✓</span>
            </div>
            <div className="flex items-center justify-between text-neutral-300">
              <span className="flex items-center gap-1.5">
                <Vibrate className="w-3.5 h-3.5 text-purple-400" />
                Compás Háptico:
              </span>
              <span className="text-emerald-400 font-mono font-bold">Sincronizado ✓</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-neutral-300 mb-6 leading-relaxed">
          Has demostrado que la intuición no proviene solo de la vista ordinaria, sino de la combinación armónica de todos tus sentidos.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => {
              sensorManager.triggerHaptic(30);
              onExplore();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-display font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Explorar el Aula 3D</span>
          </button>
          <button
            onClick={() => {
              sensorManager.triggerHaptic(30);
              onRestart();
            }}
            className="py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-display text-xs border border-neutral-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
