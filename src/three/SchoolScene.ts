import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { sensorManager } from '../services/sensorManager';
import { NPCId } from '../types';

export class SchoolScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  // Animation & Clock
  private clock: THREE.Clock;
  private animFrameId: number | null = null;
  private isPaused: boolean = false;

  // Camera navigation & controls
  public playerTargetZ: number = -2;
  public currentCameraZ: number = -2;
  private cameraBasePitch: number = 0;
  private cameraBaseYaw: number = 0;
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private isDragging: boolean = false;

  // Interactive 3D entities
  public npcMeshes: Map<NPCId, THREE.Group> = new Map();
  public interactiveObjects: THREE.Object3D[] = [];
  private mirrorMesh: THREE.Mesh | null = null;
  private resonantLockerDoor: THREE.Group | null = null;
  private resonantLockerOpenAngle: number = 0;
  private ceilingSignsGroup: THREE.Group | null = null;
  private paradoxClockHand: THREE.Mesh | null = null;
  private paradoxClockPendulum: THREE.Group | null = null;
  private doorLeft: THREE.Group | null = null;
  private doorRight: THREE.Group | null = null;
  private isDoorOpened: boolean = false;

  // Particles
  private dustParticles: THREE.Points | null = null;
  private audioParticles: THREE.Points | null = null;

  // Materials with uniforms
  private audioReactiveUniforms = {
    uTime: { value: 0 },
    uAudioLevel: { value: 0 },
  };

  // Raycaster for touch/click
  private raycaster = new THREE.Raycaster();
  private mouseVector = new THREE.Vector2();

  // Callbacks
  public onNpcClick?: (npcId: NPCId) => void;
  public onCeilingAligned?: () => void;
  public onLockerUnlocked?: () => void;
  public onMirrorScanned?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d1117');
    this.scene.fog = new THREE.FogExp2('#0d1117', 0.022);

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 120);
    this.camera.position.set(0, 1.6, this.playerTargetZ); // Eye height 1.6m

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Procedural Studio Environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting rig (Warm key + cool hemisphere + corridor lights)
    this.setupLighting();

    // 6. Build the 3D surreal school corridor & entities
    this.buildSchoolCorridor();
    this.buildNPCs();
    this.buildInteractiveZones();
    this.buildParticleSystems();
    this.buildClassroom404Interior();

    // 7. Event listeners
    this.bindEvents();

    // 8. Start render loop
    this.animate();
  }

  private setupLighting() {
    // Hemisphere fill (cool ceiling / warm linoleum floor bounce)
    const hemiLight = new THREE.HemisphereLight('#cbd5e1', '#475569', 0.6);
    this.scene.add(hemiLight);

    // Key directional light casting subtle shadows
    const keyLight = new THREE.DirectionalLight('#fff7ed', 0.8);
    keyLight.position.set(2, 6, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.bias = -0.0005;
    this.scene.add(keyLight);

    // Corridor fluorescent ceiling lights spaced every 6 meters
    for (let z = 2; z >= -36; z -= 6) {
      const pointLight = new THREE.PointLight('#fef08a', 0.45, 8, 1.8);
      pointLight.position.set(0, 3.4, z);
      this.scene.add(pointLight);

      // Light fixture model
      const fixtureGeo = new THREE.BoxGeometry(0.6, 0.08, 1.8);
      const fixtureMat = new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#fef9c3',
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });
      const fixtureMesh = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixtureMesh.position.set(0, 3.45, z);
      this.scene.add(fixtureMesh);
    }
  }

  // Procedural canvas textures
  private createTileTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // School terrazzo tile pattern
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    const tileSize = 128;
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        ctx.strokeRect(x, y, tileSize, tileSize);
        // Orange tactile guidance strip down the center
        if (x === 128 || x === 256) {
          ctx.fillStyle = 'rgba(255, 123, 28, 0.15)';
          ctx.fillRect(x + 10, y + 10, tileSize - 20, tileSize - 20);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 28);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  private createCeilingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    for (let x = 0; x < 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 28);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createLockerDoorTexture(color: string, numberText: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base paint
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 512);

    // Bevel edges
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 504);

    // Locker louvers / vents at the top
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(40, 50 + i * 16, 176, 6);
    }

    // Number plaque
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(80, 160, 96, 40);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 160, 96, 40);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(numberText, 128, 180);

    // Handle recess
    ctx.fillStyle = '#334155';
    ctx.fillRect(200, 230, 24, 70);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(204, 240, 16, 50);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  private buildSchoolCorridor() {
    const corridorLength = 48;
    const corridorWidth = 7.6;
    const corridorHeight = 3.6;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.createTileTexture(),
      roughness: 0.25,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -corridorLength / 2 + 6);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(corridorWidth, corridorLength);
    const ceilingMat = new THREE.MeshStandardMaterial({
      map: this.createCeilingTexture(),
      roughness: 0.8,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, corridorHeight, -corridorLength / 2 + 6);
    this.scene.add(ceiling);

    // Left and Right Wall base structures
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#fdfbf7', // Warm cream white school walls from moodboard
      roughness: 0.65,
    });

    const leftWallGeo = new THREE.PlaneGeometry(corridorLength, corridorHeight);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-corridorWidth / 2, corridorHeight / 2, -corridorLength / 2 + 6);
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(leftWallGeo, wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(corridorWidth / 2, corridorHeight / 2, -corridorLength / 2 + 6);
    this.scene.add(rightWall);

    // Baseboards along corridor
    const baseboardMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5 });
    const baseboardGeo = new THREE.BoxGeometry(0.1, 0.2, corridorLength);
    const bbLeft = new THREE.Mesh(baseboardGeo, baseboardMat);
    bbLeft.position.set(-corridorWidth / 2 + 0.05, 0.1, -corridorLength / 2 + 6);
    this.scene.add(bbLeft);

    const bbRight = new THREE.Mesh(baseboardGeo, baseboardMat);
    bbRight.position.set(corridorWidth / 2 - 0.05, 0.1, -corridorLength / 2 + 6);
    this.scene.add(bbRight);

    // Rows of lockers along walls (mint green and coral orange sections)
    this.buildLockerBanks(corridorWidth);

    // Glowing Exit Signs
    this.buildExitSigns();
  }

  private buildLockerBanks(corridorWidth: number) {
    const mintGreen = '#86efac';
    const coralOrange = '#fdba74';

    // Left bank of lockers
    for (let i = 0; i < 18; i++) {
      const z = -2 - i * 1.6;
      if (Math.abs(z - -17) < 2) continue; // Space for mirror zone
      const isOrange = i % 4 === 0;
      const num = 100 + i;
      this.createSingleLocker(
        -corridorWidth / 2 + 0.4,
        z,
        0,
        isOrange ? coralOrange : mintGreen,
        `#${num}`
      );
    }

    // Right bank of lockers
    for (let i = 0; i < 18; i++) {
      const z = -2 - i * 1.6;
      if (Math.abs(z - -10.5) < 1.8) continue; // Space for resonant locker
      if (Math.abs(z - -23.5) < 2) continue; // Space for clock zone
      const isOrange = i % 3 === 0;
      const num = 200 + i;
      this.createSingleLocker(
        corridorWidth / 2 - 0.4,
        z,
        Math.PI,
        isOrange ? coralOrange : mintGreen,
        `#${num}`
      );
    }
  }

  private createSingleLocker(
    x: number,
    z: number,
    rotY: number,
    color: string,
    numberText: string
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;

    // Body frame
    const bodyGeo = new THREE.BoxGeometry(0.7, 2.3, 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.4,
      metalness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.15, 0);
    group.add(body);

    // Front door
    const doorGeo = new THREE.BoxGeometry(0.68, 2.26, 0.05);
    const doorMat = new THREE.MeshStandardMaterial({
      map: this.createLockerDoorTexture(color, numberText),
      roughness: 0.35,
      metalness: 0.2,
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.15, 0.31);
    group.add(door);

    this.scene.add(group);
  }

  private buildExitSigns() {
    // Hanging luminous green Exit sign
    const signGroup = new THREE.Group();
    signGroup.position.set(0, 3.1, -12);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Francois One, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT ➔', 128, 55);
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText('SALIDA 404', 128, 95);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const signGeo = new THREE.BoxGeometry(1.2, 0.5, 0.1);
    const signMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: '#22c55e',
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signGroup.add(signMesh);

    // Hanging cables
    const cableGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.5);
    const cableMat = new THREE.MeshBasicMaterial({ color: '#334155' });
    const cable1 = new THREE.Mesh(cableGeo, cableMat);
    cable1.position.set(-0.5, 0.45, 0);
    const cable2 = new THREE.Mesh(cableGeo, cableMat);
    cable2.position.set(0.5, 0.45, 0);
    signGroup.add(cable1, cable2);

    this.scene.add(signGroup);
  }

  // Build the 5 NPCs and their visual markers
  private buildNPCs() {
    // 1. Bedel Don Gregorio (Position: -3.2, 0, -4.5)
    const bedelGroup = this.createCharacterFigure('bedel', '#f97316', '🧹', 'Don Gregorio');
    bedelGroup.position.set(-2.6, 0, -4.5);
    bedelGroup.rotation.y = Math.PI / 4;
    this.scene.add(bedelGroup);
    this.npcMeshes.set('bedel', bedelGroup);
    this.interactiveObjects.push(bedelGroup);

    // 2. Alumna Mía (Position: 3.2, 0, -10.5)
    const alumnaGroup = this.createCharacterFigure('alumna', '#10b981', '🎒', 'Mía');
    alumnaGroup.position.set(2.6, 0, -10.5);
    alumnaGroup.rotation.y = -Math.PI / 3;
    this.scene.add(alumnaGroup);
    this.npcMeshes.set('alumna', alumnaGroup);
    this.interactiveObjects.push(alumnaGroup);

    // 3. Inspector Kira (Position: -3.2, 0, -17.0)
    const inspectorGroup = this.createCharacterFigure('inspector', '#3b82f6', '📋', 'Inspector Kira');
    inspectorGroup.position.set(-2.6, 0, -17.0);
    inspectorGroup.rotation.y = Math.PI / 3;
    this.scene.add(inspectorGroup);
    this.npcMeshes.set('inspector', inspectorGroup);
    this.interactiveObjects.push(inspectorGroup);

    // 4. Profesor Paradox (Position: 3.2, 0, -23.5)
    const profGroup = this.createCharacterFigure('profesor', '#a855f7', '⏳', 'Prof. Paradox');
    profGroup.position.set(2.6, 0, -23.5);
    profGroup.rotation.y = -Math.PI / 4;
    this.scene.add(profGroup);
    this.npcMeshes.set('profesor', profGroup);
    this.interactiveObjects.push(profGroup);

    // 5. La Puerta del Aula 404 (Position: 0, 0, -30)
    this.buildGrandDoor404();
  }

  // Composite 5-part stylized character figure with anime / retro aesthetic
  private createCharacterFigure(
    id: NPCId,
    accentColor: string,
    emoji: string,
    name: string
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = id;
    group.userData = { npcId: id };

    // 1. Torso / School Uniform Blazer
    const torsoGeo = new THREE.BoxGeometry(0.65, 0.85, 0.35);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: '#1e293b', // Navy school blazer
      roughness: 0.5,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    group.add(torso);

    // Tie / Badge in accent color
    const badgeGeo = new THREE.BoxGeometry(0.12, 0.45, 0.05);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.2,
      emissive: accentColor,
      emissiveIntensity: 0.3,
    });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 1.18, 0.18);
    group.add(badge);

    // 2. Head with stylized hair
    const headGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const skinMat = new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.75;
    group.add(head);

    // Hair cap
    const hairGeo = new THREE.ConeGeometry(0.32, 0.3, 8);
    const hairMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.95;
    hair.rotation.x = 0.2;
    group.add(hair);

    // 3. Legs
    const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.8, 12);
    const pantMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 });
    const legL = new THREE.Mesh(legGeo, pantMat);
    legL.position.set(-0.16, 0.4, 0);
    const legR = new THREE.Mesh(legGeo, pantMat);
    legR.position.set(0.16, 0.4, 0);
    group.add(legL, legR);

    // 4. Grounding Contact Shadow
    const shadowGeo = new THREE.CircleGeometry(0.55, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: '#000000',
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    // 5. Floating Interactive "!" Question/Interact Marker
    const markerCanvas = document.createElement('canvas');
    markerCanvas.width = 128;
    markerCanvas.height = 128;
    const mCtx = markerCanvas.getContext('2d')!;
    mCtx.fillStyle = accentColor;
    mCtx.beginPath();
    mCtx.arc(64, 64, 56, 0, Math.PI * 2);
    mCtx.fill();
    mCtx.strokeStyle = '#ffffff';
    mCtx.lineWidth = 6;
    mCtx.stroke();
    mCtx.fillStyle = '#ffffff';
    mCtx.font = 'bold 50px Inter, sans-serif';
    mCtx.textAlign = 'center';
    mCtx.textBaseline = 'middle';
    mCtx.fillText('!', 64, 64);

    const markerTex = new THREE.CanvasTexture(markerCanvas);
    const markerMat = new THREE.SpriteMaterial({ map: markerTex });
    const markerSprite = new THREE.Sprite(markerMat);
    markerSprite.position.set(0, 2.35, 0);
    markerSprite.scale.set(0.5, 0.5, 0.5);
    markerSprite.name = 'indicatorMarker';
    group.add(markerSprite);

    // Name tag badge
    const nameCanvas = document.createElement('canvas');
    nameCanvas.width = 256;
    nameCanvas.height = 64;
    const nCtx = nameCanvas.getContext('2d')!;
    nCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    nCtx.roundRect(4, 4, 248, 56, 12);
    nCtx.fill();
    nCtx.strokeStyle = accentColor;
    nCtx.lineWidth = 3;
    nCtx.roundRect(4, 4, 248, 56, 12);
    nCtx.stroke();
    nCtx.fillStyle = '#ffffff';
    nCtx.font = 'bold 24px Inter, sans-serif';
    nCtx.textAlign = 'center';
    nCtx.textBaseline = 'middle';
    nCtx.fillText(`${emoji} ${name}`, 128, 32);

    const nameTex = new THREE.CanvasTexture(nameCanvas);
    const nameMat = new THREE.SpriteMaterial({ map: nameTex });
    const nameSprite = new THREE.Sprite(nameMat);
    nameSprite.position.set(0, 2.05, 0);
    nameSprite.scale.set(0.9, 0.22, 1);
    group.add(nameSprite);

    return group;
  }

  // Interactive Zones for the 4 sensors
  private buildInteractiveZones() {
    // ZONE 1: Gyroscope ceiling signs (Z = -4.5)
    this.ceilingSignsGroup = new THREE.Group();
    this.ceilingSignsGroup.position.set(0, 3.1, -4.5);

    const gyroSignCanvas = document.createElement('canvas');
    gyroSignCanvas.width = 512;
    gyroSignCanvas.height = 256;
    const gCtx = gyroSignCanvas.getContext('2d')!;
    gCtx.fillStyle = '#1e293b';
    gCtx.fillRect(0, 0, 512, 256);
    gCtx.strokeStyle = '#f97316';
    gCtx.lineWidth = 6;
    gCtx.strokeRect(6, 6, 500, 244);
    gCtx.fillStyle = '#f97316';
    gCtx.font = 'bold 36px Francois One, sans-serif';
    gCtx.textAlign = 'center';
    gCtx.fillText('▲ CARTEL CELESTE 404 ▲', 256, 60);
    gCtx.fillStyle = '#ffffff';
    gCtx.font = '22px Inter, sans-serif';
    gCtx.fillText('INCLINA TU DISPOSITIVO HACIA ARRIBA', 256, 110);
    gCtx.fillStyle = '#fdba74';
    gCtx.font = 'bold 28px VT323, monospace';
    gCtx.fillText('CLAVE 1: RUTA CENITAL DESBLOQUEADA', 256, 170);
    gCtx.font = '16px Inter, sans-serif';
    gCtx.fillText('El techo revela el verdadero rumbo', 256, 215);

    const gyroSignTex = new THREE.CanvasTexture(gyroSignCanvas);
    gyroSignTex.colorSpace = THREE.SRGBColorSpace;
    const gyroSignGeo = new THREE.BoxGeometry(2.4, 1.1, 0.1);
    const gyroSignMat = new THREE.MeshStandardMaterial({
      map: gyroSignTex,
      roughness: 0.3,
      emissive: '#f97316',
      emissiveIntensity: 0.25,
    });
    const gyroSignMesh = new THREE.Mesh(gyroSignGeo, gyroSignMat);
    this.ceilingSignsGroup.add(gyroSignMesh);
    this.ceilingSignsGroup.rotation.x = Math.PI / 4; // Tilted upward
    this.scene.add(this.ceilingSignsGroup);

    // ZONE 2: Resonant Locker (Z = -10.5, right wall)
    this.buildResonantLocker();

    // ZONE 3: WebRTC Camera Surveillance Mirror (Z = -17.0, left wall)
    this.buildSurveillanceMirror();

    // ZONE 4: Paradox Biometric Clock (Z = -23.5, right wall)
    this.buildParadoxClock();
  }

  // Zone 2: Resonant Locker with audio reactivity
  private buildResonantLocker() {
    const group = new THREE.Group();
    group.position.set(7.6 / 2 - 0.45, 0, -10.5);
    group.rotation.y = Math.PI;

    // Body
    const bodyGeo = new THREE.BoxGeometry(1.2, 2.5, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.3,
      metalness: 0.4,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 1.25, 0);
    group.add(body);

    // Hinged door
    this.resonantLockerDoor = new THREE.Group();
    this.resonantLockerDoor.position.set(0.6, 1.25, 0.41); // Pivot on edge

    const doorGeo = new THREE.BoxGeometry(1.18, 2.44, 0.06);
    const doorTex = this.createLockerDoorTexture('#22c55e', 'TAQUILLA 404');
    const doorMat = new THREE.MeshStandardMaterial({
      map: doorTex,
      roughness: 0.3,
      metalness: 0.3,
      emissive: '#10b981',
      emissiveIntensity: 0.2,
    });
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.set(-0.59, 0, 0); // Offset to pivot
    this.resonantLockerDoor.add(doorMesh);
    group.add(this.resonantLockerDoor);

    // Audio frequency rings inside locker
    const ringGeo = new THREE.TorusGeometry(0.35, 0.03, 16, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#86efac', wireframe: true });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 1.25, 0);
    group.add(ring);

    this.scene.add(group);
  }

  // Zone 3: Camera Surveillance Mirror
  private buildSurveillanceMirror() {
    const mirrorGroup = new THREE.Group();
    mirrorGroup.position.set(-7.6 / 2 + 0.3, 1.8, -17.0);
    mirrorGroup.rotation.y = Math.PI / 2;

    // Mirror ornate retro frame
    const frameGeo = new THREE.BoxGeometry(2.4, 2.8, 0.15);
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      metalness: 0.8,
      roughness: 0.2,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    mirrorGroup.add(frame);

    // Mirror Glass Surface (Mapped to WebRTC camera texture)
    const glassGeo = new THREE.PlaneGeometry(2.1, 2.5);
    const glassMat = new THREE.MeshStandardMaterial({
      map: sensorManager.getMirrorTexture(),
      roughness: 0.15,
      metalness: 0.25,
      emissive: '#38bdf8',
      emissiveIntensity: 0.15,
    });
    this.mirrorMesh = new THREE.Mesh(glassGeo, glassMat);
    this.mirrorMesh.position.z = 0.08;
    mirrorGroup.add(this.mirrorMesh);

    // Mirror top banner
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 256;
    bannerCanvas.height = 64;
    const bCtx = bannerCanvas.getContext('2d')!;
    bCtx.fillStyle = '#0284c7';
    bCtx.fillRect(0, 0, 256, 64);
    bCtx.fillStyle = '#ffffff';
    bCtx.font = 'bold 20px Inter, sans-serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('REGISTRO BIOMÉTRICO', 128, 38);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerGeo = new THREE.PlaneGeometry(1.6, 0.4);
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 1.6, 0.1);
    mirrorGroup.add(banner);

    this.scene.add(mirrorGroup);
  }

  // Zone 4: Paradox Biometric Clock
  private buildParadoxClock() {
    const clockGroup = new THREE.Group();
    clockGroup.position.set(7.6 / 2 - 0.25, 2.0, -23.5);
    clockGroup.rotation.y = -Math.PI / 2;

    // Outer brass rim
    const rimGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.25, 32);
    const rimMat = new THREE.MeshStandardMaterial({
      color: '#d97706',
      metalness: 0.85,
      roughness: 0.2,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    clockGroup.add(rim);

    // Clock Face
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    const fCtx = faceCanvas.getContext('2d')!;
    fCtx.fillStyle = '#fafaf9';
    fCtx.fillRect(0, 0, 512, 512);

    fCtx.strokeStyle = '#78350f';
    fCtx.lineWidth = 10;
    fCtx.strokeRect(10, 10, 492, 492);

    fCtx.fillStyle = '#78350f';
    fCtx.font = 'bold 44px Francois One, sans-serif';
    fCtx.textAlign = 'center';
    fCtx.textBaseline = 'middle';
    const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6 - Math.PI / 2;
      const x = 256 + Math.cos(angle) * 190;
      const y = 256 + Math.sin(angle) * 190;
      fCtx.fillText(numerals[i], x, y);
    }
    fCtx.fillStyle = '#c026d3';
    fCtx.font = 'bold 30px VT323, monospace';
    fCtx.fillText('PARADOX 404', 256, 320);

    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    const faceGeo = new THREE.CircleGeometry(0.98, 32);
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.4,
    });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.z = 0.13;
    clockGroup.add(face);

    // Rotating Hand
    const handGeo = new THREE.BoxGeometry(0.06, 0.75, 0.04);
    const handMat = new THREE.MeshStandardMaterial({ color: '#c026d3', emissive: '#a855f7', emissiveIntensity: 0.3 });
    this.paradoxClockHand = new THREE.Mesh(handGeo, handMat);
    this.paradoxClockHand.position.set(0, 0.3, 0.15);
    clockGroup.add(this.paradoxClockHand);

    // Swinging Pendulum below clock
    this.paradoxClockPendulum = new THREE.Group();
    this.paradoxClockPendulum.position.set(0, -1.1, 0);

    const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.0);
    const rodMat = new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.8 });
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.y = -0.5;
    this.paradoxClockPendulum.add(rod);

    const bobGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16);
    const bob = new THREE.Mesh(bobGeo, rodMat);
    bob.position.y = -1.0;
    bob.rotation.x = Math.PI / 2;
    this.paradoxClockPendulum.add(bob);

    clockGroup.add(this.paradoxClockPendulum);

    this.scene.add(clockGroup);
  }

  // Zone 5: Grand Door of Aula 404
  private buildGrandDoor404() {
    const doorFrameGroup = new THREE.Group();
    doorFrameGroup.position.set(0, 0, -30.5);

    // Frame
    const frameGeo = new THREE.BoxGeometry(3.6, 3.2, 0.4);
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#78350f', // Dark polished oak
      roughness: 0.3,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 1.6;
    doorFrameGroup.add(frame);

    // Sign above door: "AULA 404"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d')!;
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 512, 128);
    sCtx.strokeStyle = '#f59e0b';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(6, 6, 500, 116);
    sCtx.fillStyle = '#f59e0b';
    sCtx.font = 'bold 50px Francois One, sans-serif';
    sCtx.textAlign = 'center';
    sCtx.fillText('AULA 404', 256, 62);
    sCtx.fillStyle = '#fde68a';
    sCtx.font = '22px Inter, sans-serif';
    sCtx.fillText('DIMENSIÓN EXPERIMENTAL', 256, 102);

    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signGeo = new THREE.PlaneGeometry(2.4, 0.6);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: '#f59e0b',
      emissiveIntensity: 0.3,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(0, 3.2, 0.22);
    doorFrameGroup.add(sign);

    // Left Door Leaf
    this.doorLeft = new THREE.Group();
    this.doorLeft.position.set(-1.4, 1.45, 0); // Pivot at left edge
    const leafGeo = new THREE.BoxGeometry(1.4, 2.9, 0.1);
    const leafMat = new THREE.MeshStandardMaterial({
      color: '#b45309',
      roughness: 0.4,
      metalness: 0.15,
    });
    const leftMesh = new THREE.Mesh(leafGeo, leafMat);
    leftMesh.position.set(0.7, 0, 0);
    this.doorLeft.add(leftMesh);

    // Brass knob
    const knobGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const knobMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.9, roughness: 0.1 });
    const knobL = new THREE.Mesh(knobGeo, knobMat);
    knobL.position.set(1.25, 0, 0.08);
    this.doorLeft.add(knobL);
    doorFrameGroup.add(this.doorLeft);

    // Right Door Leaf
    this.doorRight = new THREE.Group();
    this.doorRight.position.set(1.4, 1.45, 0); // Pivot at right edge
    const rightMesh = new THREE.Mesh(leafGeo, leafMat);
    rightMesh.position.set(-0.7, 0, 0);
    this.doorRight.add(rightMesh);

    const knobR = new THREE.Mesh(knobGeo, knobMat);
    knobR.position.set(-1.25, 0, 0.08);
    this.doorRight.add(knobR);
    doorFrameGroup.add(this.doorRight);

    // Runes / lock indicators on the door
    const runeGeo = new THREE.CircleGeometry(0.12, 16);
    for (let i = 0; i < 4; i++) {
      const runeMat = new THREE.MeshBasicMaterial({ color: '#fbbf24', wireframe: true });
      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.position.set(-0.75 + i * 0.5, 2.1, 0.1);
      doorFrameGroup.add(rune);
    }

    doorFrameGroup.name = 'puerta404';
    doorFrameGroup.userData = { npcId: 'puerta404' };
    this.scene.add(doorFrameGroup);
    this.npcMeshes.set('puerta404', doorFrameGroup);
    this.interactiveObjects.push(doorFrameGroup);
  }

  // Inside Classroom 404 (revealed when door opens)
  private buildClassroom404Interior() {
    const classGroup = new THREE.Group();
    classGroup.position.set(0, 0, -36);

    // Classroom floor (warm light wood)
    const floorGeo = new THREE.PlaneGeometry(12, 10);
    const floorMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.4 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    classGroup.add(floor);

    // Classroom chalkboard
    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 1024;
    boardCanvas.height = 512;
    const bCtx = boardCanvas.getContext('2d')!;
    bCtx.fillStyle = '#14532d'; // Classic green chalkboard
    bCtx.fillRect(0, 0, 1024, 512);

    bCtx.strokeStyle = '#854d0e';
    bCtx.lineWidth = 14;
    bCtx.strokeRect(7, 7, 1010, 498);

    bCtx.fillStyle = '#fef08a';
    bCtx.font = 'bold 55px Francois One, sans-serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('¡BIENVENIDO AL AULA 404!', 512, 100);

    bCtx.fillStyle = '#ffffff';
    bCtx.font = '28px Inter, sans-serif';
    bCtx.fillText('E = mc² + Intuición sensorial', 512, 180);
    bCtx.fillText('✓ Giroscopio alineado con el cielo', 512, 230);
    bCtx.fillText('✓ Cerrojo sónico quebrado por tu voz', 512, 280);
    bCtx.fillText('✓ Silueta biométrica validada en el espejo', 512, 330);
    bCtx.fillText('✓ Pulso cronométrico calibrado al compás', 512, 380);

    bCtx.fillStyle = '#fb923c';
    bCtx.font = 'bold 36px VT323, monospace';
    bCtx.fillText('CALIFICACIÓN: SOBRESALIENTE 10/10', 512, 450);

    const boardTex = new THREE.CanvasTexture(boardCanvas);
    boardTex.colorSpace = THREE.SRGBColorSpace;
    const boardGeo = new THREE.PlaneGeometry(6, 3);
    const boardMat = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.6 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 2.0, -4.8);
    classGroup.add(board);

    // Classroom warm golden sun stream
    const sunLight = new THREE.DirectionalLight('#fef08a', 1.8);
    sunLight.position.set(4, 5, -34);
    sunLight.target = board;
    this.scene.add(sunLight);

    // Floating student desks in surreal angles
    for (let i = 0; i < 6; i++) {
      const desk = this.createStudentDesk();
      const x = (i % 2 === 0 ? -2.2 : 2.2);
      const z = -1.5 - Math.floor(i / 2) * 2.2;
      desk.position.set(x, 0, z);
      desk.rotation.y = (Math.random() - 0.5) * 0.4;
      classGroup.add(desk);
    }

    this.scene.add(classGroup);
  }

  private createStudentDesk(): THREE.Group {
    const group = new THREE.Group();
    // Top
    const topGeo = new THREE.BoxGeometry(1.2, 0.06, 0.8);
    const topMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.75;
    group.add(top);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.75);
    const legMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8 });
    const leg1 = new THREE.Mesh(legGeo, legMat);
    leg1.position.set(-0.55, 0.375, -0.35);
    const leg2 = new THREE.Mesh(legGeo, legMat);
    leg2.position.set(0.55, 0.375, -0.35);
    const leg3 = new THREE.Mesh(legGeo, legMat);
    leg3.position.set(-0.55, 0.375, 0.35);
    const leg4 = new THREE.Mesh(legGeo, legMat);
    leg4.position.set(0.55, 0.375, 0.35);
    group.add(leg1, leg2, leg3, leg4);

    return group;
  }

  // Particle systems: ambient dust + audio reactive energy particles
  private buildParticleSystems() {
    // 1. Ambient dust motes
    const count = 350;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = Math.random() * 3.4;
      positions[i * 3 + 2] = -Math.random() * 34;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: '#fef08a',
      size: 0.06,
      transparent: true,
      opacity: 0.65,
    });
    this.dustParticles = new THREE.Points(geo, mat);
    this.scene.add(this.dustParticles);

    // 2. Audio-reactive particle vortex near resonant locker
    const audioCount = 180;
    const audioPositions = new Float32Array(audioCount * 3);
    for (let i = 0; i < audioCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 1.2;
      audioPositions[i * 3] = 7.6 / 2 - 0.5 + Math.cos(angle) * radius;
      audioPositions[i * 3 + 1] = 1.2 + Math.sin(angle) * radius;
      audioPositions[i * 3 + 2] = -10.5 + (Math.random() - 0.5) * 0.8;
    }
    const audioGeo = new THREE.BufferGeometry();
    audioGeo.setAttribute('position', new THREE.BufferAttribute(audioPositions, 3));
    const audioMat = new THREE.PointsMaterial({
      color: '#34d399',
      size: 0.08,
      transparent: true,
      opacity: 0.8,
    });
    this.audioParticles = new THREE.Points(audioGeo, audioMat);
    this.scene.add(this.audioParticles);
  }

  // Open Door 404
  openDoor404() {
    this.isDoorOpened = true;
    this.playerTargetZ = -34; // Move player inside classroom
  }

  // Navigate directly to NPC corridor station
  navigateToNpc(npcId: NPCId) {
    const targets: Record<NPCId, number> = {
      bedel: -3.5,
      alumna: -9.5,
      inspector: -16.0,
      profesor: -22.5,
      puerta404: -28.5,
    };
    this.playerTargetZ = targets[npcId] ?? -2;
  }

  private bindEvents() {
    // Touch gestures & Mouse drag for look / navigation
    const canvas = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      this.isDragging = true;
      this.touchStartX = e.clientX;
      this.touchStartY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.touchStartX;
      const dy = e.clientY - this.touchStartY;
      this.touchStartX = e.clientX;
      this.touchStartY = e.clientY;

      // Rotate camera yaw & pitch
      this.cameraBaseYaw -= dx * 0.005;
      this.cameraBasePitch -= dy * 0.005;
      // Clamp pitch to avoid neck inversion
      this.cameraBasePitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.cameraBasePitch));
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.isDragging) {
        this.isDragging = false;
        // Raycast check if tapping an interactive object
        this.handleRaycast(e.clientX, e.clientY);
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);

    // Resize handling
    window.addEventListener('resize', this.onWindowResize);

    // Visibility change handling (pause when tab hidden as per SDD)
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private handleRaycast(clientX: number, clientY: number) {
    const rect = this.container.getBoundingClientRect();
    this.mouseVector.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVector.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseVector, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      // Find top group with npcId
      let current: THREE.Object3D | null = intersects[0].object;
      while (current && !current.userData?.npcId) {
        current = current.parent;
      }
      if (current && current.userData?.npcId && this.onNpcClick) {
        sensorManager.triggerHaptic([30, 40, 30]);
        this.onNpcClick(current.userData.npcId);
      }
    }
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private onVisibilityChange = () => {
    this.isPaused = document.hidden;
  };

  // Main animation render loop
  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);
    if (this.isPaused) return;

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // 1. Update Sensor Manager
    sensorManager.update(delta);

    // 2. Smoothly Dolly Camera to Target Position (Z axis)
    this.currentCameraZ = THREE.MathUtils.damp(
      this.currentCameraZ,
      this.playerTargetZ,
      3.5,
      delta
    );
    this.camera.position.z = this.currentCameraZ;

    // 3. Gyroscope Orientation Integration with Touch Drag
    // beta: pitch (X-axis rotation)
    // gamma: roll (Z-axis rotation)
    // alpha: yaw (Y-axis rotation)
    const gyro = sensorManager.currentOrientation;
    const gyroPitch = THREE.MathUtils.degToRad(gyro.beta - 45) * 0.8; // Offset for normal hand holding angle
    const gyroYaw = THREE.MathUtils.degToRad(-gyro.gamma) * 0.9;
    const gyroRoll = THREE.MathUtils.degToRad(gyro.alpha) * 0.05;

    // Apply combined rotations smoothly
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.cameraBaseYaw + gyroYaw;
    this.camera.rotation.x = this.cameraBasePitch + gyroPitch;
    this.camera.rotation.z = gyroRoll * 0.15;

    // Detect if user tilts device up towards ceiling (Zone 1 Challenge)
    // When pitch is tilted up significantly (e.g. beta > 65 or cameraBasePitch > 0.6)
    const totalPitch = this.cameraBasePitch + gyroPitch;
    if (totalPitch > 0.55 && Math.abs(this.currentCameraZ - -3.5) < 3.0) {
      if (this.onCeilingAligned) {
        this.onCeilingAligned();
      }
    }

    // 4. Update Audio-Reactive Elements (Zone 2)
    const audioVol = sensorManager.audioMetrics.volume;
    this.audioReactiveUniforms.uTime.value = elapsed;
    this.audioReactiveUniforms.uAudioLevel.value = audioVol;

    if (this.resonantLockerDoor) {
      // If voice/audio volume > 0.35, door vibrates and swings open!
      if (audioVol > 0.35) {
        this.resonantLockerOpenAngle = THREE.MathUtils.damp(
          this.resonantLockerOpenAngle,
          Math.PI * 0.55,
          4.0,
          delta
        );
        if (this.onLockerUnlocked) {
          this.onLockerUnlocked();
        }
      }
      this.resonantLockerDoor.rotation.y = -this.resonantLockerOpenAngle;
    }

    // Animate audio particles
    if (this.audioParticles) {
      const pScale = 1.0 + audioVol * 2.8;
      this.audioParticles.scale.set(pScale, pScale, pScale);
      this.audioParticles.rotation.y += delta * (0.8 + audioVol * 4.0);
    }

    // 5. Update Camera Mirror Texture (Zone 3)
    if (this.mirrorMesh) {
      const tex = sensorManager.getMirrorTexture();
      if ((this.mirrorMesh.material as THREE.MeshStandardMaterial).map !== tex) {
        (this.mirrorMesh.material as THREE.MeshStandardMaterial).map = tex;
        (this.mirrorMesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
      }
    }

    // 6. Update Paradox Clock (Zone 4)
    if (this.paradoxClockHand) {
      this.paradoxClockHand.rotation.z -= delta * 1.5;
    }
    if (this.paradoxClockPendulum) {
      this.paradoxClockPendulum.rotation.z = Math.sin(elapsed * 3.5) * 0.35;
    }

    // 7. Animate Grand Door 404 if opened
    if (this.isDoorOpened && this.doorLeft && this.doorRight) {
      this.doorLeft.rotation.y = THREE.MathUtils.damp(this.doorLeft.rotation.y, -Math.PI * 0.6, 2.5, delta);
      this.doorRight.rotation.y = THREE.MathUtils.damp(this.doorRight.rotation.y, Math.PI * 0.6, 2.5, delta);
    }

    // 8. Subtle floating animation on NPC indicators
    this.npcMeshes.forEach((npcGroup) => {
      const marker = npcGroup.getObjectByName('indicatorMarker');
      if (marker) {
        marker.position.y = 2.35 + Math.sin(elapsed * 3.0 + npcGroup.position.z) * 0.08;
      }
    });

    // 9. Ambient dust drift
    if (this.dustParticles) {
      this.dustParticles.rotation.y += delta * 0.02;
    }

    // 10. Render frame
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    this.renderer.dispose();
    if (this.container && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
