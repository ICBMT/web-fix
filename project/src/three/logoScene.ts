import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Shared mutable pose — pages tween this, the scene damps toward it. */
export const logoPose = {
  assemble: 1, // 0 = exploded pixels, 1 = fully built logo
  rotX: 0,
  rotY: 0,
  dist: 1.02, // camera distance multiplier
  x: 0,
  y: 0,
  scale: 1,
  spin: 1, // idle self-rotation speed
  particleSpin: 1,
};

export const defaultPose = { ...logoPose };

export function resetPose() {
  Object.assign(logoPose, defaultPose);
}

let gltfCache: Promise<GLTF> | null = null;
let progressCb: ((p: number) => void) | null = null;

export function preloadLogo(url: string, onProgress?: (p: number) => void) {
  if (onProgress) progressCb = onProgress;
  if (!gltfCache) {
    gltfCache = new GLTFLoader()
      .loadAsync(url, (ev) => {
        if (ev.total > 0) progressCb?.(ev.loaded / ev.total);
      })
      .then((gltf) => {
        // data: URLs report no total size, so always signal completion.
        progressCb?.(1);
        return gltf;
      });
  }
  return gltfCache;
}

const damp = THREE.MathUtils.damp;

export class LogoScene {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private root = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private actions: { action: THREE.AnimationAction; dur: number }[] = [];
  private maxDur = 4.567;
  private particles: THREE.Points[] = [];
  private ring!: THREE.InstancedMesh;
  private ringPivot = new THREE.Group();
  private backLight!: THREE.PointLight;
  private raf = 0;
  private clock = new THREE.Clock();
  private pointer = { x: 0, y: 0 };
  private smooth = { ...logoPose };
  private baseDist = 8;
  private autoT = 0;
  private spinAngle = 0;
  private dragVel = 0;
  private dragging = false;
  private lastX = 0;
  private mode: "autoplay" | "scrub" = "scrub";
  private running = true;
  /** Paused while the time-tunnel portal covers the screen (frees the main thread for the palette flip). */
  private tunnelCovered = false;
  private onTunnel = (e: Event) => {
    this.tunnelCovered = (e as CustomEvent<string>).detail === "covered";
  };
  private interactive: boolean;
  private disposed = false;
  private url: string;
  private dummy = new THREE.Object3D();

  private onPointer = (e: PointerEvent) => {
    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (this.dragging) {
      const dx = e.clientX - this.lastX;
      this.dragVel = THREE.MathUtils.clamp(dx * 0.0022, -0.09, 0.09);
      this.lastX = e.clientX;
    }
  };
  private onDown = (e: PointerEvent) => {
    if (!this.interactive) return;
    this.dragging = true;
    this.lastX = e.clientX;
  };
  private onUp = () => {
    this.dragging = false;
  };
  private onResize = () => this.resize();

  /** On-screen size multiplier for the logo + its cube ring (positions are unaffected). */
  private sizeFactor: number;
  private light = false;

  constructor(canvas: HTMLCanvasElement, url: string, interactive = true, sizeFactor = 1) {
    this.canvas = canvas;
    this.url = url;
    this.interactive = interactive;
    this.sizeFactor = sizeFactor;
    window.addEventListener("gp-tunnel", this.onTunnel);
  }

  async init() {
    const gltf = await preloadLogo(this.url);
    if (this.disposed) return;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const model = gltf.scene.clone(true);
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.envMapIntensity = 1.25;
          if (mat.name === "GreePixel_Yellow") {
            mat.emissive = new THREE.Color(0xf4602a);
            mat.emissiveIntensity = 0.24;
            mat.roughness = 0.28;
          } else {
            mat.roughness = 0.34;
            mat.metalness = 0.22;
          }
        }
      }
    });

    this.mixer = new THREE.AnimationMixer(model);
    this.actions = gltf.animations.map((clip) => {
      const action = this.mixer!.clipAction(clip);
      action.play();
      action.paused = true;
      return { action, dur: clip.duration };
    });
    this.maxDur = Math.max(...this.actions.map((a) => a.dur));

    const inner = new THREE.Group();
    inner.add(model);
    this.root.add(inner);
    this.scene.add(this.root);

    // lights
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(4, 6, 7);
    this.scene.add(key);
    const ember = new THREE.DirectionalLight(0xf4602a, 1.6);
    ember.position.set(-6, -3.5, 2.5);
    this.scene.add(ember);
    this.scene.add(new THREE.HemisphereLight(0xffe9d6, 0x0b0a09, 0.55));
    // pulsing ember core behind the logo — hot rim halo
    this.backLight = new THREE.PointLight(0xf4602a, 26, 14, 1.6);
    this.backLight.position.set(0, 0.4, -2.4);
    this.scene.add(this.backLight);

    // frame camera on the *assembled* state
    this.setTime(this.maxDur);
    this.root.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(this.root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    inner.position.sub(center);
    this.root.userData.size = size;

    if (this.interactive) {
      this.buildParticles(size);
      this.buildRing(size);
    }

    this.camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
    this.resize();
    window.addEventListener("resize", this.onResize);
    if (this.interactive) {
      window.addEventListener("pointermove", this.onPointer);
      window.addEventListener("pointerdown", this.onDown);
      window.addEventListener("pointerup", this.onUp);
    }

    this.clock.start();
    this.loop();
  }

  private buildParticles(size: THREE.Vector3) {
    const shell = Math.max(size.x, size.y);
    const make = (count: number, color: number, s: number, opacity: number) => {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = shell * (0.55 + Math.random() * 1.5);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.5;
        pos[i * 3 + 1] = r * Math.cos(phi) * 0.85;
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) * 0.9;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color,
        size: s,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const pts = new THREE.Points(geo, mat);
      this.particles.push(pts);
      this.scene.add(pts);
    };
    make(640, 0xf4602a, 0.045, 0.7);
    make(360, 0xf2eee5, 0.03, 0.35);
    this.applyLight();
  }

  /** Light mode: additive sparkles vanish on paper, so switch to normal blending + ink dust. */
  setLight(light: boolean) {
    this.light = light;
    this.applyLight();
  }

  private applyLight() {
    const [ember, dust] = this.particles;
    const l = this.light;
    if (ember) {
      const m = ember.material as THREE.PointsMaterial;
      m.blending = l ? THREE.NormalBlending : THREE.AdditiveBlending;
      m.opacity = l ? 0.6 : 0.7;
      m.color.setHex(l ? 0xd1440f : 0xf4602a);
    }
    if (dust) {
      const m = dust.material as THREE.PointsMaterial;
      m.blending = l ? THREE.NormalBlending : THREE.AdditiveBlending;
      m.opacity = l ? 0.4 : 0.35;
      m.color.setHex(l ? 0x2a2420 : 0xf2eee5);
    }
    if (this.renderer) this.renderer.toneMappingExposure = l ? 1.05 : 1.15;
  }

  /** A halo of tumbling pixel-cubes orbiting the logo — its "satellite ring". */
  private buildRing(size: THREE.Vector3) {
    const shell = Math.max(size.x, size.y);
    const geo = new THREE.BoxGeometry(0.055, 0.055, 0.055);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf4602a,
      emissive: 0xf4602a,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.1,
    });
    this.ring = new THREE.InstancedMesh(geo, mat, 30);
    this.ring.userData.radius = shell * 0.68;
    this.ringPivot.rotation.set(0.42, 0, 0.18);
    this.ringPivot.add(this.ring);
    this.scene.add(this.ringPivot);
  }

  setMode(mode: "autoplay" | "scrub") {
    this.mode = mode;
  }

  setTime(t: number) {
    for (const { action, dur } of this.actions) action.time = Math.min(t, dur);
    this.mixer?.update(0);
  }

  private setAssemble(a: number) {
    this.setTime(THREE.MathUtils.clamp(a, 0, 1) * this.maxDur);
  }

  private resize() {
    if (!this.renderer || !this.camera) return;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const size: THREE.Vector3 = this.root.userData.size ?? new THREE.Vector3(3, 3.5, 0.5);
    const fitH = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    const fitW = size.x / this.camera.aspect / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    this.baseDist = Math.max(fitH, fitW) * 1.06 + size.z;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.running || this.tunnelCovered) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const s = this.smooth;

    // damp toward shared pose targets
    s.assemble = damp(s.assemble, logoPose.assemble, 5, dt);
    s.rotX = damp(s.rotX, logoPose.rotX, 5, dt);
    s.rotY = damp(s.rotY, logoPose.rotY, 5, dt);
    s.dist = damp(s.dist, logoPose.dist, 4, dt);
    s.x = damp(s.x, logoPose.x, 5, dt);
    s.y = damp(s.y, logoPose.y, 5, dt);
    s.scale = damp(s.scale, logoPose.scale, 5, dt);
    s.spin = damp(s.spin, logoPose.spin, 3, dt);
    s.particleSpin = damp(s.particleSpin, logoPose.particleSpin, 3, dt);

    if (this.mode === "autoplay") {
      this.autoT += dt;
      if (this.autoT > this.maxDur + 0.7) this.autoT = 0;
      this.setTime(Math.min(this.autoT, this.maxDur));
    } else {
      this.setAssemble(s.assemble);
    }

    // idle spin + drag inertia
    this.spinAngle += dt * 0.16 * s.spin + this.dragVel;
    if (!this.dragging) this.dragVel = damp(this.dragVel, 0, 3.2, dt);

    // pointer parallax + idle float
    const px = this.interactive ? this.pointer.x : 0;
    const py = this.interactive ? this.pointer.y : 0;
    this.root.rotation.y = s.rotY + this.spinAngle + px * 0.14;
    this.root.rotation.x = s.rotX + py * 0.09 + Math.sin(t * 0.8) * 0.015;
    this.root.position.y = s.y + Math.sin(t * 1.1) * 0.045;
    this.root.position.x = s.x;
    this.root.scale.setScalar(s.scale * this.sizeFactor);

    this.camera.position.set(0, 0, this.baseDist * s.dist);
    this.camera.lookAt(0, 0, 0);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.rotation.y += dt * 0.045 * s.particleSpin * (i === 0 ? 1 : -0.7);
      p.rotation.x = Math.sin(t * 0.12) * 0.12;
    }

    // orbital cube ring
    if (this.ring) {
      this.ringPivot.rotation.z = 0.18 + Math.sin(t * 0.2) * 0.1;
      this.ringPivot.scale.setScalar(this.sizeFactor);
      const R = this.ring.userData.radius;
      for (let i = 0; i < 30; i++) {
        const a = t * 0.32 * s.spin + (i / 30) * Math.PI * 2;
        const wobble = Math.sin(t * 2 + i * 1.7) * 0.09;
        this.dummy.position.set(Math.cos(a) * R, Math.sin(a * 1.0) * wobble * 1.8, Math.sin(a) * R);
        this.dummy.position.y += Math.sin(a) * wobble;
        this.dummy.rotation.set(t * 1.1 + i, t * 0.9 + i * 0.7, i);
        const sc = 0.7 + 0.5 * Math.sin(i * 2.3 + t * 1.4);
        this.dummy.scale.setScalar(sc);
        this.dummy.updateMatrix();
        this.ring.setMatrixAt(i, this.dummy.matrix);
      }
      this.ring.instanceMatrix.needsUpdate = true;
    }

    // breathing ember back-light
    if (this.backLight) {
      this.backLight.intensity = 22 + Math.sin(t * 1.7) * 9 + Math.abs(this.dragVel) * 260;
    }

    this.renderer.render(this.scene, this.camera);
  };

  setRunning(running: boolean) {
    this.running = running;
    if (running) this.clock.getDelta();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("gp-tunnel", this.onTunnel);
    window.removeEventListener("pointermove", this.onPointer);
    window.removeEventListener("pointerdown", this.onDown);
    window.removeEventListener("pointerup", this.onUp);
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry?.dispose();
      }
    });
  }
}
