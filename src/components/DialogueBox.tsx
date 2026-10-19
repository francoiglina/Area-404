import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle2, AlertCircle, Compass, Mic, Camera, Vibrate, Sparkles } from 'lucide-react';
import { NPCData, SensorStatus, AudioMetrics, OrientationData } from '../types';
import { audioSynth } from '../services/audioSynth';
import { sensorManager } from '../services/sensorManager';

interface DialogueBoxProps {
  npc: NPCData;
  sensorStatus: SensorStatus;
  audioMetrics: AudioMetrics;
  orientationData: OrientationData;
  onCompleteChallenge: (clueId: number) => void;
  onClose: () => void;
  onUnlockClassroom: () => void;
}

export const DialogueBox: React.FC<DialogueBoxProps> = ({
  npc,
  sensorStatus,
  audioMetrics,
  orientationData,
  onCompleteChallenge,
  onClose,
  onUnlockClassroom,
}) => {
  const [dialogueStep, setDialogueStep] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hapticTapsCount, setHapticTapsCount] = useState(0);
  const [doorChoice, setDoorChoice] = useState<number | null>(null);

  const fullText = npc.completed
    ? npc.challengeSuccess[0]
    : dialogueStep < npc.dialogueIntro.length
    ? npc.dialogueIntro[dialogueStep]
    : npc.challengePrompt;

  // Typewriter effect
  useEffect(() => {
    let index = 0;
    setDisplayedText('');
    setIsTyping(true);

    const timer = setInterval(() => {
      index++;
      if (index <= fullText.length) {
        setDisplayedText(fullText.slice(0, index));
        if (index % 2 === 0) {
          audioSynth.playTextBlip();
        }
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 22);

    return () => clearInterval(timer);
  }, [fullText]);

  // Handle clicking next dialogue
  const handleNext = () => {
    sensorManager.triggerHaptic(25);
    if (isTyping) {
      // Instantly finish typing current line
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    if (dialogueStep < npc.dialogueIntro.length) {
      setDialogueStep((prev) => prev + 1);
    }
  };

  // 1. Gyroscope Challenge Trigger (Bedel)
  const handleGyroSuccess = () => {
    sensorManager.triggerHaptic([50, 40, 60]);
    audioSynth.playSuccessChime();
    onCompleteChallenge(npc.clueId);
  };

  // 2. Microphone Blow Trigger (Alumna)
  const handleMicBlow = () => {
    sensorManager.simulateMicInput(0.9, 1800);
    sensorManager.triggerHaptic([40, 60, 80]);
    audioSynth.playGlitchSound();
    setTimeout(() => {
      audioSynth.playSuccessChime();
      onCompleteChallenge(npc.clueId);
    }, 900);
  };

  // Auto trigger mic success if real mic volume is high enough
  useEffect(() => {
    if (npc.id === 'alumna' && !npc.completed && audioMetrics.volume > 0.4) {
      audioSynth.playSuccessChime();
      sensorManager.triggerHaptic([50, 50, 80]);
      onCompleteChallenge(npc.clueId);
    }
  }, [audioMetrics.volume, npc.id, npc.completed, npc.clueId, onCompleteChallenge]);

  // 3. Camera Mirror Trigger (Inspector)
  const handleCameraValidate = async () => {
    sensorManager.triggerHaptic([30, 40, 50]);
    if (!sensorStatus.cameraAllowed) {
      await sensorManager.requestCamera();
    }
    audioSynth.playGlitchSound();
    setTimeout(() => {
      audioSynth.playSuccessChime();
      onCompleteChallenge(npc.clueId);
    }, 700);
  };

  // 4. Haptic Tap Rhythm Trigger (Profesor)
  const handleHapticTap = () => {
    sensorManager.triggerHaptic([60, 30, 60]);
    audioSynth.playBeatPulse();
    const nextCount = hapticTapsCount + 1;
    setHapticTapsCount(nextCount);

    if (nextCount >= 3) {
      setTimeout(() => {
        audioSynth.playSuccessChime();
        onCompleteChallenge(npc.clueId);
      }, 300);
    }
  };

  // 5. Final Door 404 Intuition Decision
  const handleChooseDoor = (choice: number) => {
    setDoorChoice(choice);
    sensorManager.triggerHaptic([80, 50, 100, 50, 120]);
    audioSynth.playDoorOpenSound();
    onUnlockClassroom();
  };

  const isChallengePhase = dialogueStep >= npc.dialogueIntro.length && !npc.completed;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-neutral-900/95 border-2 border-neutral-700 rounded-2xl p-4 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Accent Top Border */}
        <div
          className="absolute top-0 left-0 right-0 h-1.5"
          style={{ backgroundColor: npc.portraitColor }}
        />

        {/* Header: Name, Role & Sensor Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{npc.portraitEmoji}</span>
            <div>
              <h3 className="font-display text-base font-bold text-white tracking-wide flex items-center gap-2">
                {npc.name}
                {npc.completed && <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />}
              </h3>
              <p className="text-xs text-neutral-400">{npc.role}</p>
            </div>
          </div>

          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono border"
            style={{
              borderColor: `${npc.portraitColor}80`,
              backgroundColor: `${npc.portraitColor}20`,
              color: npc.portraitColor,
            }}
          >
            {npc.id === 'bedel' && <Compass className="w-3.5 h-3.5" />}
            {npc.id === 'alumna' && <Mic className="w-3.5 h-3.5" />}
            {npc.id === 'inspector' && <Camera className="w-3.5 h-3.5" />}
            {npc.id === 'profesor' && <Vibrate className="w-3.5 h-3.5" />}
            {npc.id === 'puerta404' && <Sparkles className="w-3.5 h-3.5" />}
            <span>{npc.sensorName}</span>
          </div>
        </div>

        {/* Dialogue Text Box (Ace Attorney Style) */}
        <div className="bg-neutral-950/80 rounded-xl p-3 border border-neutral-800 min-h-[72px] mb-3">
          <p className="text-sm text-neutral-200 leading-relaxed font-sans">{displayedText}</p>
        </div>

        {/* Interactive Sensor Challenge Area */}
        {isChallengePhase && (
          <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-3 mb-3 animate-in fade-in">
            {/* 1. Bedel: Gyroscope Pitch Challenge */}
            {npc.id === 'bedel' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-300 font-mono">
                  <span>Inclinación actual: {Math.round(orientationData.beta)}°</span>
                  <span>Objetivo: &gt; 45°</span>
                </div>
                <div className="w-full bg-neutral-950 h-3 rounded-full overflow-hidden border border-neutral-700">
                  <div
                    className="h-full bg-orange-500 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, (orientationData.beta / 70) * 100))}%` }}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      sensorManager.setSimulatedGyro(0, 60, 0);
                      handleGyroSuccess();
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-display text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Alinear Inclinación al Techo (Simular)</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. Alumna: Microphone Challenge */}
            {npc.id === 'alumna' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-300 font-mono">
                  <span>Intensidad Sonora: {Math.round(audioMetrics.volume * 100)}%</span>
                  <span>Objetivo: &gt; 35%</span>
                </div>
                <div className="w-full bg-neutral-950 h-3 rounded-full overflow-hidden border border-neutral-700">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.round(audioMetrics.volume * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-neutral-400">
                  Habla fuerte a tu micrófono o usa el botón para enviar una onda sónica de resonancia:
                </p>
                <button
                  onClick={handleMicBlow}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-display text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Mic className="w-4 h-4" />
                  <span>Soplar al Micrófono (Disolver Cerrojo)</span>
                </button>
              </div>
            )}

            {/* 3. Inspector: Camera Challenge */}
            {npc.id === 'inspector' && (
              <div className="space-y-2">
                <p className="text-xs text-neutral-300">
                  El espejo de vigilancia escolar requiere que proyectes tu imagen en tiempo real:
                </p>
                <button
                  onClick={handleCameraValidate}
                  className="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-display text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Validar Rostro en el Espejo de Vigilancia</span>
                </button>
              </div>
            )}

            {/* 4. Profesor: Haptic Rhythm Tap Challenge */}
            {npc.id === 'profesor' && (
              <div className="space-y-2 text-center">
                <p className="text-xs text-neutral-300">
                  Pulsa el sensor háptico al compás del reloj ({hapticTapsCount}/3 toques):
                </p>
                <div className="flex justify-center gap-3 py-1">
                  {[0, 1, 2].map((idx) => (
                    <div
                      key={idx}
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                        idx < hapticTapsCount
                          ? 'bg-purple-600 border-purple-300 text-white scale-110 shadow-lg'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-500'
                      }`}
                    >
                      <Vibrate className="w-5 h-5" />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleHapticTap}
                  className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-display text-xs cursor-pointer shadow-md transition-all"
                >
                  ¡TOCAR AL COMPÁS HÁPTICO!
                </button>
              </div>
            )}

            {/* 5. Puerta 404: The Intuition Riddle */}
            {npc.id === 'puerta404' && (
              <div className="space-y-2">
                <p className="text-xs text-amber-200 font-semibold text-center">
                  Usa tu intuición basada en las pistas: ¿Cuál es el cerrojo verdadero?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleChooseDoor(1)}
                    className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-left text-xs transition-colors cursor-pointer"
                  >
                    <span className="font-display text-orange-400 block font-bold">1. Cerrojo Terrenal</span>
                    <span className="text-[11px] text-neutral-400">Seguir las flechas dibujadas en el suelo</span>
                  </button>
                  <button
                    onClick={() => handleChooseDoor(2)}
                    className="p-2 rounded-lg bg-amber-950/80 hover:bg-amber-900/80 border border-amber-500 text-left text-xs transition-colors cursor-pointer shadow-md ring-1 ring-amber-400/50"
                  >
                    <span className="font-display text-amber-300 block font-bold">2. El Umbral Sensorial</span>
                    <span className="text-[11px] text-neutral-300">
                      Unir la mirada cenital, la voz sonora y tu reflejo
                    </span>
                  </button>
                  <button
                    onClick={() => handleChooseDoor(3)}
                    className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-left text-xs transition-colors cursor-pointer"
                  >
                    <span className="font-display text-blue-400 block font-bold">3. Cerradura de Silencio</span>
                    <span className="text-[11px] text-neutral-400">No emitir sonido y esperar al director</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors cursor-pointer"
          >
            Cerrar diálogo
          </button>

          {!isChallengePhase && (
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-display text-xs shadow-md transition-all cursor-pointer"
            >
              <span>{dialogueStep < npc.dialogueIntro.length - 1 ? 'Siguiente' : 'Desafío del Sensor'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
