export interface SensorStatus {
  gyroscopeAllowed: boolean;
  micAllowed: boolean;
  cameraAllowed: boolean;
  hapticsSupported: boolean;
  facingMode: 'user' | 'environment';
}

export interface OrientationData {
  alpha: number; // 0 to 360 (compass/yaw)
  beta: number;  // -180 to 180 (pitch)
  gamma: number; // -90 to 90 (roll)
}

export interface AudioMetrics {
  volume: number;    // 0.0 to 1.0
  bassLevel: number; // 0.0 to 1.0
  rawByte: number;   // 0 to 255
}

export interface ClueItem {
  id: number;
  title: string;
  source: string;
  sensor: string;
  text: string;
  revealed: boolean;
  hint: string;
}

export type NPCId = 'bedel' | 'alumna' | 'inspector' | 'profesor' | 'puerta404';

export interface NPCData {
  id: NPCId;
  name: string;
  role: string;
  sensorName: string;
  sensorIcon: string;
  portraitColor: string;
  portraitEmoji: string;
  dialogueIntro: string[];
  challengePrompt: string;
  challengeSuccess: string[];
  clueId: number;
  completed: boolean;
  position: [number, number, number];
}

export interface AppState {
  isInitialized: boolean;
  permissionModalOpen: boolean;
  activeNpc: NPCData | null;
  dialogueIndex: number;
  inChallenge: boolean;
  clues: ClueItem[];
  notebookOpen: boolean;
  audioMuted: boolean;
  cinemaMode: boolean;
  devToolsOpen: boolean;
  gameCompleted: boolean;
  currentRoom: 'hallway' | 'classroom404';
}
