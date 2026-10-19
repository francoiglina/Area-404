import React, { useState } from 'react';
import { Compass, Mic, Camera, Vibrate, Sparkles, ChevronRight, ShieldCheck } from 'lucide-react';
import { sensorManager } from '../services/sensorManager';
import { audioSynth } from '../services/audioSynth';

interface PermissionModalProps {
  onStart: () => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({ onStart }) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleStartExperience = async () => {
    setIsRequesting(true);
    // Mandatory user gesture: initialize AudioContext and Synth
    audioSynth.init();
    audioSynth.startBgm();
    sensorManager.triggerHaptic(50);

    try {
      // Request sensors in accordance with SDD guidelines
      await sensorManager.requestAllPermissions();
    } catch (e) {
      console.warn('Sensors permission request finished with some denials:', e);
    } finally {
      setIsRequesting(false);
      onStart();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-md select-none overflow-y-auto">
      <div className="bg-neutral-900 border-2 border-orange-500/70 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden text-center my-auto">
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-2 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 rounded-b-full shadow-lg shadow-orange-500/40" />

        {/* School Icon & Badge */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-3xl mb-4 shadow-inner">
          🏫
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-wide mb-1">
          AULA 404
        </h1>
        <p className="text-xs font-mono uppercase text-orange-400 tracking-wider mb-4">
          Experiencia Web Inmersiva 3D
        </p>

        {/* Narrative Context */}
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3.5 text-xs text-neutral-300 leading-relaxed text-left mb-5">
          <p className="mb-2">
            Hoy es tu primer día de clases en una escuela de arquitectura imposible. Para encontrar el mítico{' '}
            <strong className="text-amber-300">Aula 404</strong>, deberás explorar los pasillos en 3D e interactuar con
            personajes que pondrán a prueba tus sentidos.
          </p>
          <p className="text-neutral-400">
            Cada pista requiere interactuar creativamente con un sensor físico de tu móvil o navegador:
          </p>
        </div>

        {/* 4 Sensor Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-xl p-2.5 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <p className="font-display text-xs font-bold text-white">Giroscopio</p>
              <p className="text-[10px] text-neutral-400">Vista 360° y cielo</p>
            </div>
          </div>

          <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-xl p-2.5 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <p className="font-display text-xs font-bold text-white">Micrófono</p>
              <p className="text-[10px] text-neutral-400">Audio-reactivo</p>
            </div>
          </div>

          <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-xl p-2.5 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <p className="font-display text-xs font-bold text-white">Cámara WebRTC</p>
              <p className="text-[10px] text-neutral-400">Espejo AR 3D</p>
            </div>
          </div>

          <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-xl p-2.5 flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <Vibrate className="w-4 h-4" />
            </div>
            <div>
              <p className="font-display text-xs font-bold text-white">Táctil y Háptico</p>
              <p className="text-[10px] text-neutral-400">Vibración rítmica</p>
            </div>
          </div>
        </div>

        {/* Permissions note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 mb-5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>El navegador solicitará permisos. Funciona también en escritorio con controles simulados.</span>
        </div>

        {/* Main CTA Button */}
        <button
          onClick={handleStartExperience}
          disabled={isRequesting}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-display text-sm font-bold tracking-wide shadow-xl shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5 text-amber-200" />
          <span>{isRequesting ? 'CONECTANDO SENSORES...' : 'INICIAR EXPERIENCIA'}</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
