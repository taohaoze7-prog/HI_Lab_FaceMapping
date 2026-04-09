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

// Five element colors
const ELEM_COLORS = {
  wood:  0x6a9e6e,
  fire:  0xc45c4a,
  earth: 0xc8a060,
  metal: 0xa8a8a0,
  water: 0x5a8ab4,
};

class HeadScene {
  constructor() {
    this.container = document.getElementById('headViewport');
    if (!this.container) return;

    this.width = 600;
    this.height = 740;
    this.clock = new THREE.Clock();
    this.headMesh = null;
    this.wireframe = null;
    this.meridianPoints = [];
    this.bloomPass = null;
    this.glowMode = false;
    this.raycaster = new THREE.Raycaster();

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
    this.controls.minAzimuthAngle = -Math.PI * 0.3;
    this.controls.maxAzimuthAngle = Math.PI * 0.3;

    // Museum warmth lighting
    const ambient = new THREE.AmbientLight(0x1a1510, 0.4);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xf0e8d8, 2.5);
    keyLight.position.set(0.3, 3.5, 3);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd4a050, 0.6);
    rimLight.position.set(-2, 1.5, -2.5);
    this.scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xc0b8a0, 0.3);
    fillLight.position.set(2.5, 0.5, 2);
    this.scene.add(fillLight);

    // Bloom
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      0.3, 0.5, 0.85
    );
    this.composer.addPass(this.bloomPass);
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
        uJadeColor: { value: new THREE.Color(0x0a1e18) },
        uJadeHighlight: { value: new THREE.Color(0x15382e) },
        uFresnelColor: { value: new THREE.Color(0x2a7a68) },
        uMeridianColor: { value: new THREE.Color(0x8a7040) },
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
          vec3 baseColor = mix(uJadeColor, uJadeHighlight, vNormal.y * 0.5 + 0.5);
          float sss = pow(max(dot(vNormal, vec3(0.0, 1.0, 0.5)), 0.0), 2.0) * 0.3;
          baseColor += uJadeHighlight * sss;

          vec3 fresnelGlow = uFresnelColor * vFresnel * (0.8 + uGlow * 0.6);

          float meridianFlow = sin(vWorldPos.y * 8.0 + uTime * 1.5) * 0.5 + 0.5;
          meridianFlow *= smoothstep(0.85, 1.0, vFresnel);
          vec3 meridianGlow = uMeridianColor * meridianFlow * (0.3 + uGlow * 0.4);

          vec3 halfDir = normalize(vViewDir + vec3(0.5, 1.0, 0.3));
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0);
          vec3 specular = vec3(0.8, 0.95, 0.9) * spec * 0.6;

          vec3 finalColor = baseColor + fresnelGlow + meridianGlow + specular;
          finalColor += vec3(0.15, 0.12, 0.06) * uGlow;

          float alpha = mix(0.92, 0.6, vFresnel * 0.5);
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

      // Core dot
      const coreGeo = new THREE.SphereGeometry(0.005, 8, 8);
      const coreMat = new THREE.MeshBasicMaterial({
        color: def.defaultColor, transparent: true, opacity: 0.15,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.copy(position);

      // Outer glow sphere
      const glowGeo = new THREE.SphereGeometry(0.018, 12, 12);
      const glowMat = new THREE.MeshBasicMaterial({
        color: def.defaultColor, transparent: true, opacity: 0.03,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(position);

      // Ripple ring (initially invisible)
      const ringGeo = new THREE.RingGeometry(0.008, 0.012, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: def.defaultColor, transparent: true, opacity: 0,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(position);
      // Orient ring to face camera approximately
      ring.lookAt(this.camera.position);

      this.scene.add(core);
      this.scene.add(glow);
      this.scene.add(ring);

      this.meridianPoints.push({
        name: def.name,
        core, glow, ring,
        baseCore: 0.15,
        baseGlow: 0.03,
        defaultColor: def.defaultColor,
        highlighted: false,
        rippleTime: -1,
      });
    });
  }

  // ── PUBLIC API ──

  /** Highlight a specific acupuncture point with element color + ripple */
  highlightPoint(index, elemType) {
    if (index < 0 || index >= this.meridianPoints.length) return;
    const p = this.meridianPoints[index];

    // Set color based on element
    const color = elemType && ELEM_COLORS[elemType]
      ? ELEM_COLORS[elemType]
      : p.defaultColor;

    p.core.material.color.setHex(color);
    p.glow.material.color.setHex(color);
    p.ring.material.color.setHex(color);

    // Flash bright
    p.highlighted = true;
    p.core.material.opacity = 1.0;
    p.glow.material.opacity = 0.6;
    p.glow.scale.setScalar(3.0);

    // Start ripple
    p.rippleTime = this.clock.getElapsedTime();
    p.ring.material.opacity = 0.8;
    p.ring.scale.setScalar(1.0);

    // Settle to elevated baseline
    setTimeout(() => {
      p.baseCore = 0.7;
      p.baseGlow = 0.15;
    }, 800);
  }

  /** All points glow during computing */
  pulseAll() {
    this.glowMode = true;
    this.meridianPoints.forEach(p => {
      p.highlighted = true;
      p.baseCore = 0.9;
      p.baseGlow = 0.35;
    });
    if (this.bloomPass) {
      this.bloomPass.strength = 0.6;
    }
    this.controls.autoRotateSpeed = 1.0;
  }

  /** Reset everything */
  resetGlow() {
    this.glowMode = false;
    this.meridianPoints.forEach(p => {
      p.highlighted = false;
      p.baseCore = 0.15;
      p.baseGlow = 0.03;
      p.rippleTime = -1;
      p.ring.material.opacity = 0;
      p.ring.scale.setScalar(1.0);
      // Reset to default color
      p.core.material.color.setHex(p.defaultColor);
      p.glow.material.color.setHex(p.defaultColor);
    });
    if (this.bloomPass) {
      this.bloomPass.strength = 0.3;
    }
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

    // Meridian points animation
    this.meridianPoints.forEach((p, i) => {
      const phase = elapsed * 0.8 + i * 1.3;
      const pulseCore = Math.sin(phase) * 0.06;
      const pulseGlow = Math.sin(phase) * 0.02;

      // Smooth lerp toward target
      const cTarget = p.baseCore + pulseCore;
      const gTarget = p.baseGlow + pulseGlow;
      p.core.material.opacity += (cTarget - p.core.material.opacity) * 0.08;
      p.glow.material.opacity += (gTarget - p.glow.material.opacity) * 0.08;

      const sTarget = p.highlighted ? 2.0 : 1.0;
      const sCurrent = p.glow.scale.x;
      p.glow.scale.setScalar(sCurrent + (sTarget - sCurrent) * 0.05);

      // Ripple animation
      if (p.rippleTime > 0) {
        const rippleAge = elapsed - p.rippleTime;
        if (rippleAge < 2.0) {
          const rippleScale = 1.0 + rippleAge * 4.0;
          const rippleAlpha = Math.max(0, 0.6 * (1.0 - rippleAge / 2.0));
          p.ring.scale.setScalar(rippleScale);
          p.ring.material.opacity = rippleAlpha;
          // Keep ring facing camera
          p.ring.lookAt(this.camera.position);
        } else {
          p.ring.material.opacity = 0;
          p.rippleTime = -1;
        }
      }
    });

    this.composer.render();
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => new HeadScene(), 300);
});
