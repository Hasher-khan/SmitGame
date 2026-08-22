/**
 * Effects.js — Professional Combat VFX
 *
 * Features:
 *  - Dynamic muzzle flash point light
 *  - Shell casing ejection with physics
 *  - Screen-shake / trauma system
 *  - Bright tracer rounds (LineSegments)
 *  - Multi-particle impact sparks + dust
 *  - Bullet hole decals
 */

import * as THREE from 'three';

const TRACER_LIFETIME = 0.055;
const MAX_TRACERS     = 50;
const MAX_CASINGS     = 60;

export class Effects {
  constructor(scene, camera, weaponView) {
    this.scene      = scene;
    this.camera     = camera;
    this.weaponView = weaponView;
    this.tracers    = [];
    this.impacts    = [];
    this.casings    = [];
    this.flashTimer = 0;

    // Screen shake
    this.trauma     = 0;   // 0–1 trauma value
    this.shakeX     = 0;
    this.shakeY     = 0;
    this._basePos   = new THREE.Vector3();
    this._baseQuat  = new THREE.Quaternion();

    // Muzzle flash mesh (attached to viewmodel scene)
    this.flashGroup = new THREE.Group();
    const flashGeo  = new THREE.SphereGeometry(0.055, 8, 8);
    const core = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({
      color: 0xffee88, transparent: true, opacity: 0,
    }));
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({
        color: 0xff7700, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    // Cross flare
    const flareH = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.018),
      new THREE.MeshBasicMaterial({
        color: 0xffcc44, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    const flareV = flareH.clone();
    flareV.rotation.z = Math.PI / 2;

    this.flashGroup.add(glow);
    this.flashGroup.add(core);
    this.flashGroup.add(flareH);
    this.flashGroup.add(flareV);
    this.flashCore  = core;
    this.flashGlow  = glow;
    this.flashFlareH = flareH;
    this.flashFlareV = flareV;
    this.weaponView.scene.add(this.flashGroup);
  }

  // ── Muzzle Flash ──────────────────────────────────────────────

  showMuzzleFlash() {
    this.flashTimer = 0.065;
    const muzzle = this.weaponView.getMuzzleWorldPosition();
    this.flashGroup.position.copy(muzzle);
    this.flashCore.material.opacity  = 1;
    this.flashGlow.material.opacity  = 0.8;
    this.flashFlareH.material.opacity = 0.7;
    this.flashFlareV.material.opacity = 0.7;
    this.flashGroup.visible = true;

    // Randomise rotation for organic look
    this.flashGroup.rotation.z = Math.random() * Math.PI * 2;

    // Notify viewmodel to pulse point light
    this.weaponView.flashMuzzleLight();
  }

  // ── Tracer Rounds ─────────────────────────────────────────────

  spawnTracer(from, to) {
    const dir      = to.clone().sub(from).normalize();
    const maxLen   = from.distanceTo(to);
    const tracerLen= Math.min(maxLen, 5.0); // tracer is shorter than full shot distance
    const tracerTo = from.clone().add(dir.multiplyScalar(tracerLen));

    const positions = new Float32Array([
      from.x, from.y, from.z,
      tracerTo.x, tracerTo.y, tracerTo.z,
    ]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0xffee44,
      transparent: true,
      opacity: 1,
      linewidth: 2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, mat, life: TRACER_LIFETIME, from: from.clone(), dir: dir.clone() });

    while (this.tracers.length > MAX_TRACERS) {
      const old = this.tracers.shift();
      this.scene.remove(old.line);
      old.line.geometry.dispose();
      old.mat.dispose();
    }
  }

  // ── Shell Casing Ejection ─────────────────────────────────────

  spawnShellCasing() {
    const muzzlePos = this.weaponView.getMuzzleWorldPosition();
    // Eject from right side of weapon
    const casingPos = muzzlePos.clone();
    casingPos.x += 0.15;
    casingPos.y += 0.0;

    const geo = new THREE.CylinderGeometry(0.005, 0.005, 0.018, 6);
    const mesh = new THREE.Mesh(geo,
      new THREE.MeshStandardMaterial({ color: 0xd4aa30, metalness: 0.9, roughness: 0.2 })
    );
    mesh.position.copy(casingPos);
    this.scene.add(mesh);

    // Random ejection velocity
    const vx =  0.5 + Math.random() * 1.5;
    const vy =  1.0 + Math.random() * 1.5;
    const vz = -0.5 + Math.random() * 1.0;
    const rx = (Math.random() - 0.5) * 25;
    const ry = (Math.random() - 0.5) * 25;

    this.casings.push({ mesh, vx, vy, vz, rx, ry, life: 2.0, grounded: false });

    while (this.casings.length > MAX_CASINGS) {
      const old = this.casings.shift();
      this.scene.remove(old.mesh);
      old.mesh.geometry.dispose();
    }
  }

  // ── Impact Sparks & Dust ──────────────────────────────────────

  spawnImpact(point, normal) {
    // Orange sparks
    for (let i = 0; i < 8; i++) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.008 + Math.random() * 0.010, 4, 4),
        new THREE.MeshBasicMaterial({
          color: i < 4 ? 0xff8800 : 0xffee44,
          transparent: true, opacity: 1,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      spark.position.copy(point);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 3.5,
        (Math.random() - 0.5) * 3
      );
      this.scene.add(spark);
      this.impacts.push({ mesh: spark, life: 0.15 + Math.random() * 0.15, maxLife: 0.3, vel });
    }

    // Dust puff (grey spheres)
    for (let i = 0; i < 5; i++) {
      const dust = new THREE.Mesh(
        new THREE.SphereGeometry(0.018 + Math.random() * 0.022, 5, 5),
        new THREE.MeshBasicMaterial({
          color: 0xaaaaaa, transparent: true, opacity: 0.7, depthWrite: false,
        })
      );
      dust.position.copy(point).addScaledVector(normal, 0.02);
      const vel = normal.clone().multiplyScalar(0.5 + Math.random() * 1.0).add(
        new THREE.Vector3((Math.random() - 0.5) * 1, Math.random() * 0.5, (Math.random() - 0.5) * 1)
      );
      this.scene.add(dust);
      this.impacts.push({ mesh: dust, life: 0.22 + Math.random() * 0.18, maxLife: 0.4, vel });
    }
  }

  // ── Screen Shake ──────────────────────────────────────────────

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /**
   * Called from Game._loop before render.
   * Returns [shakeX, shakeY] offsets to apply to camera.
   */
  getShakeOffset(delta) {
    if (this.trauma <= 0) {
      this.trauma = 0;
      return new THREE.Quaternion(); // identity — no shake
    }

    const shake = this.trauma * this.trauma;
    const t = performance.now() * 0.001;

    const ox = (Math.sin(t * 47.3) + Math.sin(t * 31.7) * 0.5) * shake * 0.012;
    const oy = (Math.cos(t * 43.1) + Math.cos(t * 27.9) * 0.5) * shake * 0.012;

    this.trauma = Math.max(0, this.trauma - (delta || 0.016) * 3.5);

    const euler = new THREE.Euler(ox, oy, 0, 'YXZ');
    return new THREE.Quaternion().setFromEuler(euler);
  }

  // ── Per-Frame Update ──────────────────────────────────────────

  update(delta) {
    // Tracers — slide along their path
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= delta;
      t.mat.opacity = Math.max(0, t.life / TRACER_LIFETIME);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.mat.dispose();
        this.tracers.splice(i, 1);
      }
    }

    // Impact particles
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const s = this.impacts[i];
      s.life -= delta;
      s.mesh.position.addScaledVector(s.vel, delta);
      s.vel.y -= 4 * delta; // gravity on sparks
      s.mesh.material.opacity = Math.max(0, s.life / s.maxLife);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this.impacts.splice(i, 1);
      }
    }

    // Shell casings physics
    for (let i = this.casings.length - 1; i >= 0; i--) {
      const c = this.casings[i];
      c.life -= delta;
      if (c.life <= 0) {
        this.scene.remove(c.mesh);
        c.mesh.geometry.dispose();
        this.casings.splice(i, 1);
        continue;
      }
      if (!c.grounded) {
        c.vy -= 9.8 * delta;
        c.mesh.position.x += c.vx * delta;
        c.mesh.position.y += c.vy * delta;
        c.mesh.position.z += c.vz * delta;
        c.mesh.rotation.x += c.rx * delta;
        c.mesh.rotation.y += c.ry * delta;
        if (c.mesh.position.y <= 0.02) {
          c.mesh.position.y = 0.02;
          c.vy = -c.vy * 0.3;
          c.vx *= 0.6;
          c.vz *= 0.6;
          if (Math.abs(c.vy) < 0.1) c.grounded = true;
        }
      }
    }

    // Flash decay
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      const t = Math.max(0, this.flashTimer / 0.065);
      this.flashCore.material.opacity   = t;
      this.flashGlow.material.opacity   = t * 0.8;
      this.flashFlareH.material.opacity = t * 0.7;
      this.flashFlareV.material.opacity = t * 0.7;
      this.flashCore.scale.setScalar(1 + (1 - t) * 2.5);
      this.flashGlow.scale.setScalar(1 + (1 - t) * 1.5);
      if (this.flashTimer <= 0) this.flashGroup.visible = false;
    }
  }
}
