/* ============================================
   HEAD SCENE v2 — 玉石生化人 3D Renderer
   Raycasting acupoint placement,
   five-element colored highlights,
   ripple glow effects.
   ============================================ */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Five element colors — brightened ×1.35 for visibility on ivory sculpture
const ELEM_COLORS = {
  wood:  0x8fd696,  // was 0x6a9e6e
  fire:  0xff7d64,  // was 0xc45c4a
  earth: 0xffd982,  // was 0xc8a060
  metal: 0xe2e2d8,  // was 0xa8a8a0
  water: 0x7ab9f2,  // was 0x5a8ab4
};

const WHITE_STRIKE = 0xffffff;

// Phase timings (seconds)
const STRIKE_DURATION    = 0.18;  // Phase 1: white flash
const SETTLE_DURATION    = 0.35;  // Phase 2: color transition
const RIPPLE_INTERVAL    = 0.35;  // Time between ripple waves
const RIPPLE_DURATION    = 1.5;   // How long one ripple lives
const MAX_RIPPLES        = 3;     // 3 concentric waves
const BLOOM_BURST_PEAK   = 0.9;
const BLOOM_BURST_FADE   = 0.8;   // Fade duration
const BLOOM_STEADY_HI    = 0.45;  // When any point is highlighted
const BLOOM_STEADY_LO    = 0.30;  // Default idle

class HeadScene {
  constructor() {
    this.container = document.getElementById('headViewport');
    if (!this.container) return;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.clock = new THREE.Clock();
    this.headMesh = null;
    this.wireframe = null;
    this.meridianPoints = [];
    this.bloomPass = null;
    this.glowMode = false;
    this.bloomBurstStart = -1;
    this.raycaster = new THREE.Raycaster();

    // Reusable color scratches for the animate loop
    this._whiteColor   = new THREE.Color(WHITE_STRIKE);
    this._elemScratch  = new THREE.Color();
    this._lerpScratch  = new THREE.Color();

    if (typeof Chamber !== 'undefined') {
      Chamber.headScene = this;
    }
    window._headScene = this;

    this.init();
    this.loadModel();
    this.animate();
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setClearColor(0x000000, 0);

    const canvas = this.renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '1';
    this.container.insertBefore(canvas, this.container.firstChild);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(24, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 0.1, 3.8);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.3;
    this.controls.minPolarAngle = Math.PI * 0.35;
    this.controls.maxPolarAngle = Math.PI * 0.65;
    // No azimuth clamp — let auto-rotate spin the sculpture freely on entry

    // Museum sculpture lighting — dramatic contrast, spotlight from above
    const ambient = new THREE.AmbientLight(0x1a140c, 0.25);
    this.scene.add(ambient);

    // Key light: warm tungsten museum spot, strong from above
    const keyLight = new THREE.DirectionalLight(0xfff0d8, 3.2);
    keyLight.position.set(0.2, 4.5, 2);
    this.scene.add(keyLight);

    // Rim light: antique gold outline on the shadow side
    const rimLight = new THREE.DirectionalLight(0xd4a050, 0.9);
    rimLight.position.set(-2.5, 1, -2);
    this.scene.add(rimLight);

    // Subtle fill — just enough to lift shadows, not flatten them
    const fillLight = new THREE.DirectionalLight(0x8a7d68, 0.15);
    fillLight.position.set(2, -0.5, 1.5);
    this.scene.add(fillLight);

    // Bloom
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(this.width, this.height);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      0.3, 0.5, 0.85
    );
    this.composer.addPass(this.bloomPass);

    // Responsive resize
    window.addEventListener('resize', () => this.onResize());
  }

  onResize() {
    this.width  = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);
    this.bloomPass.resolution.set(this.width, this.height);
  }

  loadModel() {
    const loader = new GLTFLoader();

    loader.load('assets/head.glb', (gltf) => {
      const model = gltf.scene;

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.5 / maxDim;

      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      model.position.y -= 0.1;

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = this.createJadeMaterial();
          child.castShadow = true;
          child.receiveShadow = true;
          this.headMesh = child;
          this.createWireframeOverlay(child);
        }
      });

      this.scene.add(model);

      // Create acupoints AFTER model is in scene, using raycasting
      this.createMeridianPointsRaycast(model);

      if (typeof Chamber !== 'undefined') {
        Chamber.headScene = this;
      }
    },
    undefined,
    (error) => console.error('GLB load error:', error));
  }

  createJadeMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        // 古玉雕塑 — weathered ivory / aged marble with subdued depth
        uJadeColor:     { value: new THREE.Color(0xaea497) },  // 陈年象牙（深乳白，带土灰）
        uJadeHighlight: { value: new THREE.Color(0xd8cfbc) },  // 受光面柔白
        uFresnelColor:  { value: new THREE.Color(0xc8a060) },  // 边缘暖金（恢复温润）
        uMeridianColor: { value: new THREE.Color(0xc8a060) },  // 经络流光（古金）
        uGlow: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        varying float vFresnel;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(normalMatrix * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          float dotNV = dot(vNormal, vViewDir);
          vFresnel = pow(1.0 - max(dotNV, 0.0), 3.0);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uJadeColor;
        uniform vec3 uJadeHighlight;
        uniform vec3 uFresnelColor;
        uniform vec3 uMeridianColor;
        uniform float uGlow;

        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        varying float vFresnel;

        void main() {
          // 雕塑基色 — 顶部受光柔白，底部深入阴影（戏剧性明暗对比）
          float upFactor = vNormal.y * 0.5 + 0.5;
          vec3 baseColor = mix(uJadeColor * 0.55, uJadeHighlight, pow(upFactor, 1.4));

          // Sub-surface scattering — 暖金透光，保留羊脂玉的温润
          float sss = pow(max(dot(vNormal, vec3(0.0, 1.0, 0.4)), 0.0), 2.0) * 0.25;
          baseColor += uFresnelColor * sss * 0.6;

          // Fresnel 边缘暖金描边 — 恢复动画可见度
          vec3 fresnelGlow = uFresnelColor * vFresnel * (0.55 + uGlow * 0.5);

          // 经络流光 — 恢复基础流动感，uGlow 触发时显著增强
          float meridianFlow = sin(vWorldPos.y * 8.0 + uTime * 1.5) * 0.5 + 0.5;
          meridianFlow *= smoothstep(0.8, 1.0, vFresnel);
          vec3 meridianGlow = uMeridianColor * meridianFlow * (0.22 + uGlow * 0.5);

          // 高光 — 雕塑式哑光，较弱且柔和（非镜面玉）
          vec3 halfDir = normalize(vViewDir + vec3(0.4, 1.0, 0.3));
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
          vec3 specular = vec3(0.95, 0.9, 0.8) * spec * 0.25;

          // 深阴影强化 — 底面和背光面更深，增加雕塑感
          float shadowDepth = pow(1.0 - upFactor, 2.0) * 0.3;
          baseColor -= vec3(0.1, 0.09, 0.07) * shadowDepth;

          vec3 finalColor = baseColor + fresnelGlow + meridianGlow + specular;
          finalColor += vec3(0.18, 0.14, 0.08) * uGlow;

          // 雕塑不透明度高，接近完全实体
          float alpha = mix(0.98, 0.85, vFresnel * 0.3);
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
    });
  }

  createWireframeOverlay(mesh) {
    const wireGeo = mesh.geometry.clone();
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x5a9080,
      wireframe: true,
      transparent: true,
      opacity: 0.015,
    });
    this.wireframe = new THREE.Mesh(wireGeo, wireMat);
    this.wireframe.scale.copy(mesh.scale);
    this.wireframe.position.copy(mesh.position);
    this.wireframe.rotation.copy(mesh.rotation);
    mesh.parent.add(this.wireframe);
  }

  /**
   * Place acupoints using raycasting against the model surface.
   * Falls back to approximate positions if ray misses.
   */
  createMeridianPointsRaycast(model) {
    // Update world matrices so raycasting works
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const halfH = size.y * 0.5;
    const halfW = size.x * 0.5;
    const halfD = size.z * 0.5;

    // Collect all meshes for raycasting
    const meshes = [];
    model.traverse(c => { if (c.isMesh) meshes.push(c); });

    // Acupoint definitions: name, ray origin direction, default element color
    const pointDefs = [
      // 0: 百会 — top of head, ray from above
      { name: '百会',
        origin: new THREE.Vector3(center.x, center.y + halfH + 0.5, center.z),
        dir: new THREE.Vector3(0, -1, 0),
        defaultColor: ELEM_COLORS.earth },
      // 1: 印堂 — between eyebrows, ray from front
      { name: '印堂',
        origin: new THREE.Vector3(center.x, center.y + halfH * 0.35, center.z + halfD + 0.5),
        dir: new THREE.Vector3(0, 0, -1),
        defaultColor: ELEM_COLORS.wood },
      // 2: 太阳R — right temple
      { name: '太阳R',
        origin: new THREE.Vector3(center.x + halfW + 0.5, center.y + halfH * 0.25, center.z + halfD * 0.4),
        dir: new THREE.Vector3(-1, 0, -0.3).normalize(),
        defaultColor: ELEM_COLORS.fire },
      // 3: 太阳L — left temple
      { name: '太阳L',
        origin: new THREE.Vector3(center.x - halfW - 0.5, center.y + halfH * 0.25, center.z + halfD * 0.4),
        dir: new THREE.Vector3(1, 0, -0.3).normalize(),
        defaultColor: ELEM_COLORS.fire },
      // 4: 人中 — below nose
      { name: '人中',
        origin: new THREE.Vector3(center.x, center.y - halfH * 0.1, center.z + halfD + 0.5),
        dir: new THREE.Vector3(0, 0, -1),
        defaultColor: ELEM_COLORS.metal },
      // 5: 承浆 — below lower lip
      { name: '承浆',
        origin: new THREE.Vector3(center.x, center.y - halfH * 0.3, center.z + halfD + 0.5),
        dir: new THREE.Vector3(0, 0, -1),
        defaultColor: ELEM_COLORS.water },
      // 6: 颧骨R — right cheekbone
      { name: '颧骨R',
        origin: new THREE.Vector3(center.x + halfW * 0.7, center.y + halfH * 0.1, center.z + halfD + 0.5),
        dir: new THREE.Vector3(-0.3, 0, -1).normalize(),
        defaultColor: ELEM_COLORS.fire },
      // 7: 颧骨L — left cheekbone
      { name: '颧骨L',
        origin: new THREE.Vector3(center.x - halfW * 0.7, center.y + halfH * 0.1, center.z + halfD + 0.5),
        dir: new THREE.Vector3(0.3, 0, -1).normalize(),
        defaultColor: ELEM_COLORS.fire },
    ];

    const group = model;

    pointDefs.forEach(def => {
      // Raycast to find surface point
      this.raycaster.set(def.origin, def.dir);
      const hits = this.raycaster.intersectObjects(meshes, true);

      let position;
      if (hits.length > 0) {
        position = hits[0].point.clone();
        // Offset slightly outward along the hit normal
        const normal = hits[0].face.normal.clone()
          .transformDirection(hits[0].object.matrixWorld);
        position.add(normal.multiplyScalar(0.008));
      } else {
        // Fallback: approximate position
        position = def.origin.clone().add(def.dir.clone().multiplyScalar(0.5));
      }

      // Core dot — slightly larger, solid pinpoint
      const coreGeo = new THREE.SphereGeometry(0.010, 12, 12);
      const coreMat = new THREE.MeshBasicMaterial({
        color: def.defaultColor, transparent: true, opacity: 0.25,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.copy(position);

      // Outer glow sphere — much larger halo
      const glowGeo = new THREE.SphereGeometry(0.040, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: def.defaultColor, transparent: true, opacity: 0.08,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(position);

      this.scene.add(core);
      this.scene.add(glow);

      // Three ripple rings — staggered for continuous wave
      const rings = [];
      for (let i = 0; i < MAX_RIPPLES; i++) {
        const ringGeo = new THREE.RingGeometry(0.012, 0.020, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: def.defaultColor, transparent: true, opacity: 0,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position);
        ring.lookAt(this.camera.position);
        this.scene.add(ring);
        rings.push({ mesh: ring, born: -1 });
      }

      this.meridianPoints.push({
        name: def.name,
        core, glow, rings,
        position: position.clone(),
        defaultColor: def.defaultColor,
        // State machine
        highlighted: false,
        strikeStartTime: -1,
        elemColor: def.defaultColor,
        ripplesSpawned: 0,
        lastRippleTime: -1,
      });
    });
  }

  // ── PUBLIC API ──

  /** Highlight an acupuncture point — three-phase activation */
  highlightPoint(index, elemType) {
    if (index < 0 || index >= this.meridianPoints.length) return;
    const p = this.meridianPoints[index];

    // Resolve element color
    const color = elemType && ELEM_COLORS[elemType]
      ? ELEM_COLORS[elemType]
      : p.defaultColor;

    // Kick off the state machine
    p.highlighted      = true;
    p.strikeStartTime  = this.clock.getElapsedTime();
    p.elemColor        = color;
    p.ripplesSpawned   = 0;
    p.lastRippleTime   = -1;

    // Reset ring pool
    p.rings.forEach(r => {
      r.born = -1;
      r.mesh.material.opacity = 0;
      r.mesh.material.color.setHex(color);
      r.mesh.scale.setScalar(1.0);
    });

    // Trigger bloom burst
    this.bloomBurstStart = this.clock.getElapsedTime();
  }

  /** All points glow during computing */
  pulseAll() {
    this.glowMode = true;
    const now = this.clock.getElapsedTime();
    this.meridianPoints.forEach(p => {
      if (!p.highlighted) {
        p.highlighted     = true;
        p.strikeStartTime = now;
        p.ripplesSpawned  = 0;
        p.lastRippleTime  = -1;
        p.rings.forEach(r => {
          r.born = -1;
          r.mesh.material.opacity = 0;
          r.mesh.material.color.setHex(p.elemColor);
          r.mesh.scale.setScalar(1.0);
        });
      }
    });
    this.bloomBurstStart = now;
    this.controls.autoRotateSpeed = 1.0;
  }

  /** Reset all highlights back to idle state */
  resetGlow() {
    this.glowMode = false;
    this.bloomBurstStart = -1;
    this.meridianPoints.forEach(p => {
      p.highlighted     = false;
      p.strikeStartTime = -1;
      p.ripplesSpawned  = 0;
      p.lastRippleTime  = -1;
      p.elemColor       = p.defaultColor;

      // Reset visible state
      p.core.material.color.setHex(p.defaultColor);
      p.core.material.opacity = 0.25;
      p.core.scale.setScalar(1.0);

      p.glow.material.color.setHex(p.defaultColor);
      p.glow.material.opacity = 0.08;
      p.glow.scale.setScalar(1.0);

      p.rings.forEach(r => {
        r.born = -1;
        r.mesh.material.opacity = 0;
        r.mesh.material.color.setHex(p.defaultColor);
        r.mesh.scale.setScalar(1.0);
      });
    });
    if (this.bloomPass) this.bloomPass.strength = BLOOM_STEADY_LO;
    this.controls.autoRotateSpeed = 0.3;
    if (this.headMesh && this.headMesh.material.uniforms) {
      this.headMesh.material.uniforms.uGlow.value = 0.0;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();

    this.controls.update();

    // Shader time + glow
    if (this.headMesh && this.headMesh.material.uniforms) {
      this.headMesh.material.uniforms.uTime.value = elapsed;
      const targetGlow = this.glowMode ? 0.6 : 0.0;
      const currentGlow = this.headMesh.material.uniforms.uGlow.value;
      this.headMesh.material.uniforms.uGlow.value += (targetGlow - currentGlow) * 0.02;
    }

    // Wireframe breathing
    if (this.wireframe) {
      const wBase = this.glowMode ? 0.04 : 0.015;
      this.wireframe.material.opacity = wBase + Math.sin(elapsed * 0.5) * 0.008;
    }

    // ── Bloom burst — cinematic punch when a point activates ──
    if (this.bloomPass) {
      const anyHighlighted = this.meridianPoints.some(p => p.highlighted);
      const steady = anyHighlighted ? BLOOM_STEADY_HI : BLOOM_STEADY_LO;
      let targetBloom = steady;
      if (this.bloomBurstStart >= 0) {
        const burstAge = elapsed - this.bloomBurstStart;
        if (burstAge < BLOOM_BURST_FADE) {
          const t = burstAge / BLOOM_BURST_FADE;
          targetBloom = BLOOM_BURST_PEAK + (steady - BLOOM_BURST_PEAK) * t;
        } else {
          this.bloomBurstStart = -1;
          targetBloom = steady;
        }
      }
      this.bloomPass.strength += (targetBloom - this.bloomPass.strength) * 0.08;
    }

    // ── Meridian points — three-phase activation state machine ──
    const whiteColor  = this._whiteColor;
    const elemScratch = this._elemScratch;
    const lerpScratch = this._lerpScratch;

    this.meridianPoints.forEach((p, i) => {
      if (!p.highlighted) {
        // Idle base pulse — subtle breathing on default color
        const phase = elapsed * 0.8 + i * 1.3;
        const cTarget = 0.25 + Math.sin(phase) * 0.06;
        const gTarget = 0.08 + Math.sin(phase) * 0.02;
        p.core.material.color.setHex(p.defaultColor);
        p.glow.material.color.setHex(p.defaultColor);
        p.core.material.opacity += (cTarget - p.core.material.opacity) * 0.08;
        p.glow.material.opacity += (gTarget - p.glow.material.opacity) * 0.08;
        // Relax scales back to 1.0
        const cs = p.core.scale.x + (1.0 - p.core.scale.x) * 0.12;
        const gs = p.glow.scale.x + (1.0 - p.glow.scale.x) * 0.12;
        p.core.scale.setScalar(cs);
        p.glow.scale.setScalar(gs);
        // Fade out any lingering rings
        p.rings.forEach(r => {
          if (r.mesh.material.opacity > 0) {
            r.mesh.material.opacity *= 0.85;
            if (r.mesh.material.opacity < 0.01) {
              r.mesh.material.opacity = 0;
              r.born = -1;
            }
          }
        });
        return;
      }

      const age = elapsed - p.strikeStartTime;
      elemScratch.setHex(p.elemColor);

      if (age < STRIKE_DURATION) {
        // Phase 1 — white strike lerping to element color, expanding 1 → 4x
        const t = age / STRIKE_DURATION;
        lerpScratch.copy(whiteColor).lerp(elemScratch, t);
        p.core.material.color.copy(lerpScratch);
        p.glow.material.color.copy(lerpScratch);
        const scale = 1.0 + t * 3.0;           // 1 → 4
        p.core.scale.setScalar(scale);
        p.glow.scale.setScalar(scale);
        p.core.material.opacity = 0.25 + t * 0.75;  // 0.25 → 1.0
        p.glow.material.opacity = 0.08 + t * 0.62;  // 0.08 → 0.70

      } else if (age < STRIKE_DURATION + SETTLE_DURATION) {
        // Phase 2 — settle: core 4→2, glow 4→3, opacities ease down
        const t = (age - STRIKE_DURATION) / SETTLE_DURATION;
        p.core.material.color.copy(elemScratch);
        p.glow.material.color.copy(elemScratch);
        p.core.scale.setScalar(4.0 - 2.0 * t);       // 4 → 2
        p.glow.scale.setScalar(4.0 - 1.0 * t);       // 4 → 3
        p.core.material.opacity = 1.0 - 0.15 * t;    // 1.0 → 0.85
        p.glow.material.opacity = 0.70 - 0.35 * t;   // 0.70 → 0.35

      } else {
        // Phase 3 — steady breathing + staggered ripples
        const phase3Age = age - STRIKE_DURATION - SETTLE_DURATION;
        const breatheCycle = Math.sin(phase3Age * (Math.PI * 2 / 2.5)) * 0.5 + 0.5; // 0..1 over 2.5s
        p.core.material.color.copy(elemScratch);
        p.glow.material.color.copy(elemScratch);
        p.core.scale.setScalar(2.0);
        p.glow.scale.setScalar(3.0);
        p.core.material.opacity = 0.85;
        p.glow.material.opacity = 0.25 + breatheCycle * 0.20;  // 0.25 ↔ 0.45

        // Spawn ripple waves, staggered by RIPPLE_INTERVAL
        if (p.ripplesSpawned < MAX_RIPPLES) {
          const nextSpawnAt = p.ripplesSpawned * RIPPLE_INTERVAL;
          if (phase3Age >= nextSpawnAt) {
            const ring = p.rings[p.ripplesSpawned];
            ring.born = elapsed;
            ring.mesh.material.color.copy(elemScratch);
            ring.mesh.material.opacity = 0.9;
            ring.mesh.scale.setScalar(1.0);
            p.ripplesSpawned++;
          }
        } else if (this.glowMode) {
          // Computing mode — recycle ripples for continuous waves
          const allDone = p.rings.every(r => r.born < 0 || (elapsed - r.born) >= RIPPLE_DURATION);
          if (allDone) {
            p.ripplesSpawned = 0;
            p.rings.forEach(r => {
              r.born = -1;
              r.mesh.material.opacity = 0;
            });
          }
        }
      }

      // Animate any live ripples for this point
      p.rings.forEach(r => {
        if (r.born < 0) return;
        const rAge = elapsed - r.born;
        if (rAge >= RIPPLE_DURATION) {
          r.mesh.material.opacity = 0;
          r.born = -1;
          return;
        }
        const t = rAge / RIPPLE_DURATION;
        // Ease-out expansion: 1 → 8x
        const eased = 1.0 - Math.pow(1.0 - t, 2.0);
        const scale = 1.0 + eased * 7.0;
        r.mesh.scale.setScalar(scale);
        r.mesh.material.opacity = 0.9 * (1.0 - t);
        r.mesh.lookAt(this.camera.position);
      });
    });

    this.composer.render();
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => new HeadScene(), 300);
});
