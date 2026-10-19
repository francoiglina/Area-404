import React, { useState, useEffect } from 'react';
import { Compass, Mic, Camera, Vibrate, Volume2, VolumeX, BookOpen, Sliders, RefreshCw } from 'lucide-react';
import { SensorStatus, OrientationData, AudioMetrics } from '../types';
import { sensorManager } from '../services/sensorManager';
import { audioSynth } from '../services/audioSynth';

interface TopStatusBarProps {
  sensorStatus: SensorStatus;
  orientationData: OrientationData;
  audioMetrics: AudioMetrics;
  cluesCount: number;
  totalClues: number;
  onOpenNotebook: () => void;
  onToggleSimBar: () => void;
  isSimBarOpen: boolean;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  sensorStatus,
  orientationData,
  audioMetrics,
  cluesCount,
  totalClues,
  onOpenNotebook,
  onToggleSimBar,
  isSimBarOpen,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [hapticPulsing, setHapticPulsing] = useState(false);

  useEffect(() => {
    sensorManager.onHapticPulse = () => {
      setHapticPulsing(true);
      setTimeout(() => setHapticPulsing(false), 200);
    };
  }, []);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioSynth.setMuted(next);
  };

  const handleToggleCameraFacing = async () => {
    sensorManager.triggerHaptic(30);
    await sensorManager.toggleCameraFacing();
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-30 px-3 py-2 flex items-center justify-between pointer-events-none select-none">
      {/* Left: App Title & Sensor Status Chips */}
      <div className="flex items-center gap-1.5 pointer-events-auto flex-wrap">
        <div className="bg-neutral-900/90 border border-neutral-700/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
          <span className="font-display font-bold text-orange-400 text-sm tracking-wider">AULA 404</span>
          <span className="text-[10px] bg-orange-500/20 text-orange-300 font-mono px-1 py-0.5 rounded">v1.0</span>
        </div>

        {/* Gyroscope Indicator */}
        <div
          title={`Giroscopio: Pitch ${Math.round(orientationData.beta)}° / Roll ${Math.round(orientationData.gamma)}°`}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono border transition-all ${
            sensorStatus.gyroscopeAllowed || sensorManager.isUsingSimulatedGyro
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
              : 'bg-neutral-900/80 border-neutral-700 text-neutral-400'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">GYRO</span>
          <span className="text-[11px] font-bold">{Math.round(orientationData.beta)}°</span>
        </div>

        {/* Microphone VU Meter */}
        <div
          title="Medidor de volumen de micrófono"
          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono border transition-all ${
            sensorStatus.micAllowed
              ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
              : 'bg-neutral-900/80 border-neutral-700 text-neutral-400'
          }`}
        >
          <Mic className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">MIC</span>
          {/* Mini VU meter bar */}
          <div className="w-10 h-2 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.round(audioMetrics.volume * 100))}%` }}
            />
          </div>
        </div>

        {/* Camera Indicator & Switcher */}
        <button
          onClick={handleToggleCameraFacing}
          title="Cámara WebRTC: Clic para alternar frontal/trasera"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono border transition-all ${
            sensorStatus.cameraAllowed
              ? 'bg-sky-950/80 border-sky-500/60 text-sky-300 cursor-pointer hover:bg-sky-900/80'
              : 'bg-neutral-900/80 border-neutral-700 text-neutral-400'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">CAM</span>
          {sensorStatus.cameraAllowed && <RefreshCw className="w-2.5 h-2.5 ml-0.5 text-sky-400" />}
        </button>

        {/* Haptic Pulse Indicator */}
        <div
          title="Retroalimentación háptica / vibración"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono border transition-all ${
            hapticPulsing
              ? 'bg-purple-600 text-white scale-110 border-purple-300'
              : 'bg-purple-950/80 border-purple-500/60 text-purple-300'
          }`}
        >
          <Vibrate className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">HÁPTICO</span>
        </div>
      </div>

      {/* Right: Audio Toggle, Clues Notebook & Simulation Drawer Button */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Simulation / Controls toggle */}
        <button
          onClick={onToggleSimBar}
          className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
            isSimBarOpen
              ? 'bg-orange-500 text-white border-orange-400 shadow-lg'
              : 'bg-neutral-900/90 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
          }`}
          title="Abrir controles y simulador de sensores"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Mute button */}
        <button
          onClick={toggleMute}
          className="p-1.5 rounded-lg bg-neutral-900/90 border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
          title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Clues Notebook Button */}
        <button
          onClick={onOpenNotebook}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-display text-xs border border-orange-400 shadow-md transition-all cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">PISTAS</span>
          <span className="bg-white/20 font-mono px-1.5 py-0.5 rounded text-[11px] font-bold">
            {cluesCount}/{totalClues}
          </span>
        </button>
      </div>
    </header>
  );
};
