import React, { useState, useEffect, useRef } from 'react';
import { SchoolScene } from './three/SchoolScene';
import { sensorManager } from './services/sensorManager';
import { audioSynth } from './services/audioSynth';
import { NPCS_DATA, INITIAL_CLUES } from './data/storyData';
import { NPCData, NPCId, ClueItem, OrientationData, AudioMetrics, SensorStatus } from './types';
import { TopStatusBar } from './components/TopStatusBar';
import { DialogueBox } from './components/DialogueBox';
import { CluesNotebook } from './components/CluesNotebook';
import { PermissionModal } from './components/PermissionModal';
import { SensorSimulationBar } from './components/SensorSimulationBar';
import { VictoryModal } from './components/VictoryModal';
import { Info, Sparkles } from 'lucide-react';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SchoolScene | null>(null);

  // App States
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeNpc, setActiveNpc] = useState<NPCData | null>(null);
  const [clues, setClues] = useState<ClueItem[]>(INITIAL_CLUES);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [simBarOpen, setSimBarOpen] = useState(false);
  const [victoryModalOpen, setVictoryModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live sensor metrics for HUD (updated via interval to keep React light)
  const [orientationData, setOrientationData] = useState<OrientationData>({ alpha: 0, beta: 0, gamma: 0 });
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({ volume: 0, bassLevel: 0, rawByte: 0 });
  const [sensorStatus, setSensorStatus] = useState<SensorStatus>(sensorManager.status);

  // Show a temporary toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initialize Three.js scene inside isolated ref
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const scene = new SchoolScene(canvasContainerRef.current);
    sceneRef.current = scene;

    // Handle NPC click via Raycaster
    scene.onNpcClick = (npcId: NPCId) => {
      const npc = NPCS_DATA[npcId];
      if (npc) {
        setActiveNpc({ ...npc });
        scene.navigateToNpc(npcId);
      }
    };

    // Auto sensor achievements
    scene.onCeilingAligned = () => {
      if (!NPCS_DATA.bedel.completed) {
        showToast('¡Has alineado la vista con el techo! Pista 1 lista.');
      }
    };

    scene.onLockerUnlocked = () => {
      if (!NPCS_DATA.alumna.completed) {
        showToast('¡El cerrojo sónico de la taquilla 404 se ha abierto!');
      }
    };

    return () => {
      scene.dispose();
      sceneRef.current = null;
      sensorManager.dispose();
    };
  }, []);

  // 2. Poll sensor state smoothly for the UI
  useEffect(() => {
    const interval = setInterval(() => {
      setOrientationData({ ...sensorManager.currentOrientation });
      setAudioMetrics({ ...sensorManager.audioMetrics });
      setSensorStatus({ ...sensorManager.status });
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // Start experience from permission modal
  const handleStartExperience = () => {
    setIsInitialized(true);
    showToast('Explora el pasillo: arrastra para mirar y toca a los personajes.');
  };

  // Handle completing an NPC challenge and unlocking a clue
  const handleCompleteChallenge = (clueId: number) => {
    if (clueId > 0) {
      setClues((prev) =>
        prev.map((c) => (c.id === clueId ? { ...c, revealed: true } : c))
      );
      showToast(`¡Pista #${clueId} desbloqueada en tu cuaderno!`);
    }

    if (activeNpc) {
      NPCS_DATA[activeNpc.id].completed = true;
      setActiveNpc({ ...NPCS_DATA[activeNpc.id] });
    }
  };

  // Final door unlock -> Classroom 404
  const handleUnlockClassroom = () => {
    setActiveNpc(null);
    if (sceneRef.current) {
      sceneRef.current.openDoor404();
    }
    setTimeout(() => {
      setVictoryModalOpen(true);
    }, 1800);
  };

  // Teleport player from simulation drawer
  const handleTeleport = (npcId: NPCId) => {
    if (sceneRef.current) {
      sceneRef.current.navigateToNpc(npcId);
    }
    const npc = NPCS_DATA[npcId];
    if (npc) {
      setActiveNpc({ ...npc });
    }
  };

  // Restart experience
  const handleRestart = () => {
    setVictoryModalOpen(false);
    setActiveNpc(null);
    setClues(INITIAL_CLUES.map((c) => ({ ...c, revealed: false })));
    Object.keys(NPCS_DATA).forEach((key) => {
      NPCS_DATA[key].completed = false;
    });
    if (sceneRef.current) {
      sceneRef.current.playerTargetZ = -2;
    }
    showToast('Experiencia reiniciada.');
  };

  const revealedCluesCount = clues.filter((c) => c.revealed).length;

  return (
    <div className="relative w-full h-full overflow-hidden bg-neutral-950 font-sans select-none">
      {/* 3D WebGL Canvas Mount (isolated ref container) */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full z-0 touch-none" />

      {/* Welcome & Permission Modal */}
      {!isInitialized && <PermissionModal onStart={handleStartExperience} />}

      {/* Top Status Bar (Live Gyro, VU Mic Meter, Camera, Haptic, Notebook) */}
      {isInitialized && (
        <TopStatusBar
          sensorStatus={sensorStatus}
          orientationData={orientationData}
          audioMetrics={audioMetrics}
          cluesCount={revealedCluesCount}
          totalClues={clues.length}
          onOpenNotebook={() => setNotebookOpen(true)}
          onToggleSimBar={() => setSimBarOpen(!simBarOpen)}
          isSimBarOpen={simBarOpen}
        />
      )}

      {/* Active NPC Visual Novel Dialogue Box */}
      {isInitialized && activeNpc && (
        <DialogueBox
          npc={activeNpc}
          sensorStatus={sensorStatus}
          audioMetrics={audioMetrics}
          orientationData={orientationData}
          onCompleteChallenge={handleCompleteChallenge}
          onClose={() => setActiveNpc(null)}
          onUnlockClassroom={handleUnlockClassroom}
        />
      )}

      {/* Bottom Hint Banner when not in dialogue */}
      {isInitialized && !activeNpc && !simBarOpen && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-neutral-900/80 border border-neutral-700/80 text-neutral-300 text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-sm">
            <Info className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>Arrastra la pantalla o inclina tu móvil para mirar • Toca a los personajes</span>
          </div>
        </div>
      )}

      {/* Clues Notebook Modal */}
      <CluesNotebook
        clues={clues}
        isOpen={notebookOpen}
        onClose={() => setNotebookOpen(false)}
        onGoToDoor={() => {
          handleTeleport('puerta404');
        }}
      />

      {/* Sensor Simulation & Quick Navigation Drawer */}
      {isInitialized && (
        <SensorSimulationBar
          isOpen={simBarOpen}
          onToggle={() => setSimBarOpen(!simBarOpen)}
          orientationData={orientationData}
          onTeleportTo={handleTeleport}
          activeNpcId={activeNpc?.id || null}
        />
      )}

      {/* Victory Modal for Classroom 404 */}
      <VictoryModal
        isOpen={victoryModalOpen}
        onExplore={() => setVictoryModalOpen(false)}
        onRestart={handleRestart}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-orange-600/95 border border-orange-400 text-white font-display text-xs px-4 py-2 rounded-xl shadow-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-200 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
