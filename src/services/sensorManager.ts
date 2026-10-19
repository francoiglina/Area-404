import * as THREE from 'three';
import { OrientationData, AudioMetrics, SensorStatus } from '../types';

export class SensorManager {
  // Sensor statuses
  public status: SensorStatus = {
    gyroscopeAllowed: false,
    micAllowed: false,
    cameraAllowed: false,
    hapticsSupported: false,
    facingMode: 'environment',
  };

  // Raw & Smoothed Orientation
  private targetOrientation: OrientationData = { alpha: 0, beta: 0, gamma: 0 };
  public currentOrientation: OrientationData = { alpha: 0, beta: 0, gamma: 0 };
  public simulatedOrientation: OrientationData = { alpha: 0, beta: 0, gamma: 0 };
  public isUsingSimulatedGyro: boolean = false;

  // Audio / Mic
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private audioDataArray: Uint8Array | null = null;
  public audioMetrics: AudioMetrics = { volume: 0, bassLevel: 0, rawByte: 0 };
  private simulatedMicVolume: number = 0;

  // Camera
  public videoElement: HTMLVideoElement | null = null;
  public cameraStream: MediaStream | null = null;
  public videoTexture: THREE.VideoTexture | null = null;
  public fallbackCanvasTexture: THREE.CanvasTexture | null = null;
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private fallbackCtx: CanvasRenderingContext2D | null = null;

  // Callbacks
  public onHapticPulse?: () => void;

  constructor() {
    this.status.hapticsSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
    this.createFallbackCanvasTexture();
  }

  // Request all permissions upon user gesture
  async requestAllPermissions(): Promise<SensorStatus> {
    await this.requestGyroscope();
    await this.requestMicrophone();
    await this.requestCamera('environment');
    return this.status;
  }

  // 1. Gyroscope / DeviceOrientation
  async requestGyroscope(): Promise<boolean> {
    try {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function'
      ) {
        // iOS 13+ permission flow
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          this.bindOrientationEvent();
          this.status.gyroscopeAllowed = true;
          return true;
        } else {
          this.status.gyroscopeAllowed = false;
          return false;
        }
      } else if ('ondeviceorientation' in window) {
        // Android / Non-iOS standard
        this.bindOrientationEvent();
        this.status.gyroscopeAllowed = true;
        return true;
      }
    } catch (err) {
      console.warn('Orientation permission error:', err);
    }
    this.status.gyroscopeAllowed = false;
    return false;
  }

  private bindOrientationEvent() {
    window.addEventListener(
      'deviceorientation',
      (e: DeviceOrientationEvent) => {
        if (e.alpha !== null || e.beta !== null || e.gamma !== null) {
          this.targetOrientation.alpha = e.alpha || 0;
          this.targetOrientation.beta = e.beta || 0;
          this.targetOrientation.gamma = e.gamma || 0;
        }
      },
      { passive: true }
    );
  }

  // Set manual gyro tilt for simulation/desktop testing
  setSimulatedGyro(alpha: number, beta: number, gamma: number) {
    this.isUsingSimulatedGyro = true;
    this.simulatedOrientation.alpha = alpha;
    this.simulatedOrientation.beta = beta;
    this.simulatedOrientation.gamma = gamma;
  }

  resetSimulatedGyro() {
    this.isUsingSimulatedGyro = false;
    this.simulatedOrientation = { alpha: 0, beta: 0, gamma: 0 };
  }

  // 2. Microphone (Web Audio API)
  async requestMicrophone(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micStream = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      const source = this.audioCtx.createMediaStreamSource(stream);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128; // As per SDD spec
      this.analyser.smoothingTimeConstant = 0.6;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.audioDataArray = new Uint8Array(bufferLength);

      this.status.micAllowed = true;
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or unavailable:', err);
      this.status.micAllowed = false;
      return false;
    }
  }

  // Trigger simulated voice/blow into mic (for desktop or quiet testing)
  simulateMicInput(level: number = 0.9, durationMs: number = 2000) {
    this.simulatedMicVolume = level;
    setTimeout(() => {
      this.simulatedMicVolume = 0;
    }, durationMs);
  }

  // 3. Camera (WebRTC)
  async requestCamera(facingMode: 'environment' | 'user' = 'environment'): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }

      // Stop existing stream if toggling
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach((track) => track.stop());
        this.cameraStream = null;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.cameraStream = stream;
      this.status.facingMode = facingMode;

      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('autoplay', '');
        this.videoElement.setAttribute('muted', '');
        this.videoElement.muted = true;
        this.videoElement.style.display = 'none';
        document.body.appendChild(this.videoElement);
      }

      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      if (!this.videoTexture) {
        this.videoTexture = new THREE.VideoTexture(this.videoElement);
        this.videoTexture.colorSpace = THREE.SRGBColorSpace;
        this.videoTexture.minFilter = THREE.LinearFilter;
        this.videoTexture.magFilter = THREE.LinearFilter;
      }

      this.status.cameraAllowed = true;
      return true;
    } catch (err) {
      console.warn('Camera permission denied or unavailable:', err);
      this.status.cameraAllowed = false;
      return false;
    }
  }

  async toggleCameraFacing(): Promise<'user' | 'environment'> {
    const nextMode = this.status.facingMode === 'environment' ? 'user' : 'environment';
    await this.requestCamera(nextMode);
    return nextMode;
  }

  // Procedural fallback texture for the mirror if camera is disabled
  private createFallbackCanvasTexture() {
    this.fallbackCanvas = document.createElement('canvas');
    this.fallbackCanvas.width = 512;
    this.fallbackCanvas.height = 512;
    this.fallbackCtx = this.fallbackCanvas.getContext('2d');
    this.drawFallbackFrame(0);

    this.fallbackCanvasTexture = new THREE.CanvasTexture(this.fallbackCanvas);
    this.fallbackCanvasTexture.colorSpace = THREE.SRGBColorSpace;
  }

  private drawFallbackFrame(time: number) {
    if (!this.fallbackCtx || !this.fallbackCanvas) return;
    const ctx = this.fallbackCtx;
    const w = this.fallbackCanvas.width;
    const h = this.fallbackCanvas.height;

    // Surreal digital school reflection / glitch grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#38bdf822';
    ctx.lineWidth = 2;
    const step = 32;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Holographic student silhouette in mirror
    const headX = w / 2 + Math.sin(time * 2) * 8;
    const headY = h / 2 - 40 + Math.cos(time * 2) * 5;

    ctx.fillStyle = '#f9731633';
    ctx.beginPath();
    ctx.arc(headX, headY, 65, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf844';
    ctx.beginPath();
    ctx.ellipse(headX, headY + 120, 110, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Scanning laser line
    const scanY = (time * 120) % h;
    ctx.fillStyle = 'rgba(255, 123, 28, 0.7)';
    ctx.fillRect(0, scanY, w, 4);

    // Text overlay
    ctx.fillStyle = '#ffedd5';
    ctx.font = '22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ESPEJO DE VIGILANCIA 404', w / 2, 70);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#fdba74';
    ctx.fillText('ESCANEANDO SILUETA ESCOLAR...', w / 2, h - 50);
  }

  // 4. Haptic Feedback
  triggerHaptic(pattern: number | number[] = 50) {
    if (this.status.hapticsSupported) {
      try {
        navigator.vibrate(pattern);
      } catch (_) {}
    }
    if (this.onHapticPulse) {
      this.onHapticPulse();
    }
  }

  // Called in per-frame requestAnimationFrame loop
  update(delta: number) {
    // 1. Orientation Lerp Smoothing
    const lerpFactor = Math.min(1.0, delta * 7.5);
    const src = this.isUsingSimulatedGyro ? this.simulatedOrientation : this.targetOrientation;

    this.currentOrientation.alpha = THREE.MathUtils.lerp(
      this.currentOrientation.alpha,
      src.alpha,
      lerpFactor
    );
    this.currentOrientation.beta = THREE.MathUtils.lerp(
      this.currentOrientation.beta,
      src.beta,
      lerpFactor
    );
    this.currentOrientation.gamma = THREE.MathUtils.lerp(
      this.currentOrientation.gamma,
      src.gamma,
      lerpFactor
    );

    // 2. Audio level calculation
    if (this.analyser && this.audioDataArray) {
      this.analyser.getByteFrequencyData(this.audioDataArray as any);
      let sum = 0;
      let bassSum = 0;
      const binCount = this.audioDataArray.length;
      const bassBins = Math.floor(binCount * 0.25);

      for (let i = 0; i < binCount; i++) {
        sum += this.audioDataArray[i];
        if (i < bassBins) {
          bassSum += this.audioDataArray[i];
        }
      }

      const realVol = sum / (binCount * 255);
      const bass = bassBins > 0 ? bassSum / (bassBins * 255) : 0;

      // Blend real volume or simulated volume
      const targetVol = Math.max(realVol, this.simulatedMicVolume);
      this.audioMetrics.volume = THREE.MathUtils.lerp(this.audioMetrics.volume, targetVol, delta * 12);
      this.audioMetrics.bassLevel = THREE.MathUtils.lerp(this.audioMetrics.bassLevel, bass, delta * 12);
      this.audioMetrics.rawByte = Math.round(this.audioMetrics.volume * 255);
    } else if (this.simulatedMicVolume > 0) {
      this.audioMetrics.volume = THREE.MathUtils.lerp(
        this.audioMetrics.volume,
        this.simulatedMicVolume,
        delta * 12
      );
      this.audioMetrics.bassLevel = this.audioMetrics.volume * 0.8;
      this.audioMetrics.rawByte = Math.round(this.audioMetrics.volume * 255);
    } else {
      this.audioMetrics.volume = THREE.MathUtils.lerp(this.audioMetrics.volume, 0, delta * 6);
      this.audioMetrics.bassLevel = 0;
      this.audioMetrics.rawByte = 0;
    }

    // 3. Fallback canvas texture animation if camera not active
    if (!this.status.cameraAllowed && this.fallbackCanvasTexture) {
      this.drawFallbackFrame(performance.now() * 0.001);
      this.fallbackCanvasTexture.needsUpdate = true;
    }
  }

  getMirrorTexture(): THREE.Texture {
    if (this.status.cameraAllowed && this.videoTexture) {
      return this.videoTexture;
    }
    return this.fallbackCanvasTexture || new THREE.Texture();
  }

  dispose() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
    }
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
    }
  }
}

export const sensorManager = new SensorManager();
