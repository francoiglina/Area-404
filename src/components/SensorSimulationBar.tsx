import React from 'react';
import { Compass, Mic, Camera, Vibrate, ChevronDown, ChevronUp, MapPin, Sparkles } from 'lucide-react';
import { NPCId, OrientationData } from '../types';
import { sensorManager } from '../services/sensorManager';
import { audioSynth } from '../services/audioSynth';

interface SensorSimulationBarProps {
  isOpen: boolean;
  onToggle: () => void;
  orientationData: OrientationData;
  onTeleportTo: (npcId: NPCId) => void;
  activeNpcId: NPCId | null;
}

export const SensorSimulationBar: React.FC<SensorSimulationBarProps> = ({
  isOpen,
  onToggle,
  orientationData,
  onTeleportTo,
  activeNpcId,
}) => {
  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    sensorManager.setSimulatedGyro(
      sensorManager.simulatedOrientation.alpha,
      val,
      sensorManager.simulatedOrientation.gamma
    );
  };

  const handleYawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    sensorManager.setSimulatedGyro(
      sensorManager.simulatedOrientation.alpha,
      sensorManager.simulatedOrientation.beta,
      val
    );
  };

  const handleTestMicBlow = () => {
    sensorManager.triggerHaptic(40);
    sensorManager.simulateMicInput(0.85, 2000);
    audioSynth.playGlitchSound();
  };

  const handleTestHaptic = () => {
    sensorManager.triggerHaptic([60, 40, 60, 40, 100]);
    audioSynth.playBeatPulse();
  };

  const handleToggleCam = async () => {
    sensorManager.triggerHaptic(30);
    await sensorManager.toggleCameraFacing();
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-3 transition-transform duration-300">
      {/* Toggle Tab */}
      <div className="flex justify-center">
        <button
          onClick={onToggle}
          className="bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border-t border-x border-neutral-700 px-4 py-1 rounded-t-xl text-xs font-mono flex items-center gap-1.5 shadow-lg cursor-pointer"
        >
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          <span>{isOpen ? 'Ocultar Panel de Pruebas' : 'Simulador de Sensores y Navegación'}</span>
        </button>
      </div>

      {/* Main Drawer Body */}
      {isOpen && (
        <div className="bg-neutral-900/95 border border-neutral-700 rounded-t-2xl p-3 shadow-2xl backdrop-blur-md space-y-3 animate-in slide-in-from-bottom duration-200">
          {/* Quick Corridor Stations Teleportation */}
          <div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 mb-1.5">
              <MapPin className="w-3 h-3 text-orange-400" />
              <span>ESTACIONES EN EL PASILLO 3D:</span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
              {[
                { id: 'bedel', name: '1. Bedel', color: 'border-orange-500' },
                { id: 'alumna', name: '2. Taquilla', color: 'border-emerald-500' },
                { id: 'inspector', name: '3. Espejo', color: 'border-sky-500' },
                { id: 'profesor', name: '4. Reloj', color: 'border-purple-500' },
                { id: 'puerta404', name: '5. Puerta', color: 'border-yellow-500' },
              ].map((station) => (
                <button
                  key={station.id}
                  onClick={() => onTeleportTo(station.id as NPCId)}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-display border transition-all cursor-pointer ${
                    activeNpcId === station.id
                      ? 'bg-neutral-800 text-white font-bold ring-1 ring-orange-400'
                      : 'bg-neutral-950/80 text-neutral-300 hover:bg-neutral-800'
                  } ${station.color}`}
                >
                  {station.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sensor Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-neutral-800">
            {/* Gyro sliders */}
            <div className="bg-neutral-950/70 p-2 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 mb-1">
                <span className="flex items-center gap-1">
                  <Compass className="w-3 h-3" />
                  Inclinación (Pitch)
                </span>
                <span>{Math.round(orientationData.beta)}°</span>
              </div>
              <input
                type="range"
                min="-60"
                max="80"
                value={Math.round(orientationData.beta)}
                onChange={handlePitchChange}
                className="w-full accent-orange-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                <button
                  onClick={() => sensorManager.setSimulatedGyro(0, 0, 0)}
                  className="hover:text-neutral-300 underline cursor-pointer"
                >
                  0° Recto
                </button>
                <button
                  onClick={() => sensorManager.setSimulatedGyro(0, 60, 0)}
                  className="hover:text-orange-400 underline cursor-pointer"
                >
                  60° Techo
                </button>
              </div>
            </div>

            {/* Mic blow simulation */}
            <div className="bg-neutral-950/70 p-2 rounded-xl border border-neutral-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 mb-1">
                <span className="flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  Prueba de Micrófono
                </span>
              </div>
              <button
                onClick={handleTestMicBlow}
                className="w-full py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white font-display text-xs transition-colors cursor-pointer"
              >
                Simular Soplo / Voz
              </button>
            </div>

            {/* Camera & Haptic trigger */}
            <div className="bg-neutral-950/70 p-2 rounded-xl border border-neutral-800 flex gap-2">
              <button
                onClick={handleToggleCam}
                className="flex-1 py-1 px-1 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-600 text-sky-300 text-[11px] font-mono flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                title="Cambiar cámara frontal / trasera"
              >
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>Cámara</span>
              </button>

              <button
                onClick={handleTestHaptic}
                className="flex-1 py-1 px-1 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-600 text-purple-300 text-[11px] font-mono flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                title="Probar vibración háptica"
              >
                <Vibrate className="w-3.5 h-3.5 text-purple-400" />
                <span>Vibración</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
