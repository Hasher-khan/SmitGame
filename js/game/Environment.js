/**
 * Environment.js — Professional Outdoor Tactical Shooting Range
 *
 * Open-air military training facility with covered firing bay,
 * gravel lanes, earthen berms, wooden target frames, and distant terrain.
 */

import * as THREE from 'three';
import { createSky } from './Sky.js';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.targets = [];
    this.targetGroups = [];
    this.bounds = { minX: -2.2, maxX: 2.2, minZ: 4, maxZ: 62 };
    this.animTargets = [];
  }

  build() {
    createSky(this.scene);
    this._buildLighting();
    this._buildTerrain();
    this._buildFiringBay();
    this._buildLane();
    this._buildBerms();
    this._buildTargetLines();
    this._buildTargets();
    this._buildProps();
  }

  getBounds() { return this.bounds; }
  getSpawnPoint() { return new THREE.Vector3(0, 1.65, 6); }
  getTargets() { return this.targets; }

  update(delta) {
    const t = performance.now() * 0.001;
    this.targetGroups.forEach((g, i) => {
      if (g.userData.swing) {
        g.rotation.y = Math.sin(t * 0.8 + i * 1.2) * 0.04;
      }
    });
    this.animTargets.forEach((tgt) => {
      if (tgt.userData.popUp) {
        tgt.position.y = THREE.MathUtils.lerp(tgt.position.y, tgt.userData.restY, delta * 3);
      }
    });

    // Animate flag wave
    if (this.flagMesh) {
      const pos = this.flagMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const wave = Math.sin(t * 3.5 + x * 5.0) * 0.04 * x;
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
    }
  }

  _buildLighting() {
    // Sky / ambient (grittier, less saturated, high dynamic range feel)
    this.scene.add(new THREE.HemisphereLight(0x8ba6c1, 0x2b2e2a, 0.45));

    // Sun (sharp, intense, slightly warm)
    const sun = new THREE.DirectionalLight(0xfff5e6, 2.2);
    sun.position.set(50, 70, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096); // higher res shadows
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 150;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    // Cool rim bounce light from the ground/sky
    const rim = new THREE.DirectionalLight(0x6080a0, 0.4);
    rim.position.set(-40, 10, -30);
    this.scene.add(rim);

    // Covered bay ceiling strip lights (fluorescent white)
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-1.2, 0, 1.2].forEach((x) => {
      const tube = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 2.0), stripMat);
      tube.position.set(x, 3.12, 5);
      this.scene.add(tube);
      const light = new THREE.PointLight(0xfffaed, 0.7, 7);
      light.position.set(x, 3.0, 5);
      this.scene.add(light);
    });
  }

  _buildTerrain() {
    // Grittier dirt/grass base with noise-like roughness
    const mat = new THREE.MeshStandardMaterial({
      color: 0x303628,
      roughness: 1.0,
      metalness: 0.02
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(250, 250, 1, 1), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Distant hills (darker, atmospheric fade)
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x223022, roughness: 1 });
    [[-60, 80], [70, 90], [0, 110]].forEach(([x, z], i) => {
      const hill = new THREE.Mesh(
        new THREE.ConeGeometry(35 + i * 12, 22 + i * 6, 12),
        hillMat
      );
      hill.position.set(x, 8, z);
      this.scene.add(hill);
    });

    // Tree line (simple cones)
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3020 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d5a30 });
    for (let i = -8; i <= 8; i++) {
      if (i === 0) continue;
      const x = i * 5.5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2, 6), trunkMat);
      trunk.position.set(x, 1, 75);
      this.scene.add(trunk);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 8), leafMat);
      leaves.position.set(x, 3.2, 75);
      this.scene.add(leaves);
    }
  }

  _buildFiringBay() {
    const concrete = new THREE.MeshStandardMaterial({ color: 0x888890, roughness: 0.88 });
    const metal    = new THREE.MeshStandardMaterial({ color: 0x484855, metalness: 0.65, roughness: 0.38 });
    const darkMetal= new THREE.MeshStandardMaterial({ color: 0x2a2a32, metalness: 0.8, roughness: 0.3 });

    // Platform
    const platform = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.28, 4.5), concrete);
    platform.position.set(0, 0.14, 5);
    platform.receiveShadow = true;
    platform.castShadow = true;
    this.scene.add(platform);

    // Roof overhang
    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.14, 3.8), metal);
    roof.position.set(0, 3.2, 5);
    roof.castShadow = true;
    this.scene.add(roof);

    // Roof supports (4 posts)
    [[-2.6, 6.8], [2.6, 6.8], [-2.6, 3.3], [2.6, 3.3]].forEach(([x, z]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), darkMetal);
      post.position.set(x, 1.6, z);
      post.castShadow = true;
      this.scene.add(post);
    });

    // Back wall of firing bay
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.4, 0.16), concrete);
    backWall.position.set(0, 1.7, 3.2);
    this.scene.add(backWall);
    // horizontal beam across back wall
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.14, 0.12), darkMetal);
    topBeam.position.set(0, 3.27, 3.2);
    this.scene.add(topBeam);

    // Shooting bench (thick)
    const bench = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 0.75), concrete);
    bench.position.set(0, 1.06, 4.2);
    this.scene.add(bench);
    // Bench legs
    [[-1.8, 4.2], [1.8, 4.2]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.06, 0.08), darkMetal);
      leg.position.set(x, 0.53, z);
      this.scene.add(leg);
    });

    // Lane dividers (jersey barriers)
    [-2.6, 2.6].forEach((x) => {
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.15, 3.5), concrete);
      barrier.position.set(x, 0.575, 5.5);
      barrier.castShadow = true;
      this.scene.add(barrier);
      // stripe
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.06, 3.5),
        new THREE.MeshStandardMaterial({ color: 0xff9900, emissive: 0x995500, emissiveIntensity: 0.2 }));
      stripe.position.set(x, 0.85, 5.5);
      this.scene.add(stripe);
    });

    // Bay number plate (emissive yellow)
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.38, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xf0c030, emissive: 0xf09010, emissiveIntensity: 0.4 })
    );
    plate.position.set(0, 2.6, 3.28);
    this.scene.add(plate);

    // Warning tape across front of bay
    const tape = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.03, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xffdd00 }));
    tape.position.set(0, 1.1, 3.5);
    this.scene.add(tape);
  }

  _buildLane() {
    const gravel = new THREE.MeshStandardMaterial({ color: 0x6a6a68, roughness: 0.95 });
    const lane = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 118), gravel);
    lane.position.set(0, 0.04, 64);
    lane.receiveShadow = true;
    this.scene.add(lane);

    // Center dashed line
    for (let z = 10; z < 120; z += 3) {
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.02, 1.2),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      dash.position.set(0, 0.1, z);
      this.scene.add(dash);
    }
  }

  _buildBerms() {
    const dirt = new THREE.MeshStandardMaterial({ color: 0x5c4a32, roughness: 1 });
    [-5.5, 5.5].forEach((x) => {
      const berm = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.8, 118), dirt);
      berm.position.set(x, 1.3, 64);
      berm.receiveShadow = true;
      this.scene.add(berm);
      // Grass cap
      const grass = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.15, 118),
        new THREE.MeshStandardMaterial({ color: 0x4a7c4e, roughness: 1 })
      );
      grass.position.set(x, 2.75, 64);
      this.scene.add(grass);
    });

    // Back berm / bullet trap
    const backBerm = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 3), dirt);
    backBerm.position.set(0, 1.8, 124);
    this.scene.add(backBerm);
  }

  _buildTargetLines() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 });
    [25, 50, 75, 100].forEach((z) => {
      // Distance marker posts
      [-2.3, 2.3].forEach((x) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), postMat);
        post.position.set(x, 0.6, z - 1);
        this.scene.add(post);
      });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.06, 0.06), postMat);
      rail.position.set(0, 1.15, z - 1);
      this.scene.add(rail);

      // Distance sign
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.35, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      sign.position.set(-2.3, 0.9, z - 1);
      sign.rotation.y = Math.PI / 6;
      this.scene.add(sign);
    });
  }

  _buildTargets() {
    // 45m Staggered Group (Paper)
    this._createPaperTarget(-1.2, 42, 1.0, false);
    this._createPaperTarget(0.5, 46, 0.9, true);

    // Boot Target at 40m (close-range body silhouette)
    this._createBootTarget(1.5, 38, 1.0);

    // 65m Staggered Group (Paper & Steel)
    this._createPaperTarget(-0.8, 62, 0.82, true);
    this._createSteelTarget(1.2, 68, 0.75);

    // Boot Target at 80m (mid-range silhouette)
    this._createBootTarget(-1.5, 80, 0.85);

    // 95m Staggered Group (Steel)
    this._createSteelTarget(-1.0, 92, 0.7);
    this._createSteelTarget(0.8, 98, 0.65);

    // 120m Far Target (Steel) — long-range challenge
    this._createSteelTarget(0.0, 118, 0.55);
  }

  _createPaperTarget(x, z, scale, swing) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.85 });
    const frameGroup = new THREE.Group();
    frameGroup.position.set(x, 0, z);
    frameGroup.userData.swing = swing;

    // Wooden frame
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.1), frameMat);
    leftPost.position.set(-0.7 * scale, 1.1, 0);
    leftPost.castShadow = true;
    frameGroup.add(leftPost);
    const rightPost = leftPost.clone();
    rightPost.position.x = 0.7 * scale;
    frameGroup.add(rightPost);
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.5 * scale, 0.08, 0.08), frameMat);
    topBar.position.set(0, 2.15, 0);
    frameGroup.add(topBar);

    const targetGroup = new THREE.Group();
    targetGroup.position.set(0, 1.35, 0.06);

    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xf8f4ec,
      roughness: 0.92,
      side: THREE.DoubleSide,
    });
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.0 * scale, 1.2 * scale), paperMat);
    targetGroup.add(paper);

    // Silhouette + rings painted on
    const silhouette = new THREE.Mesh(
      new THREE.CircleGeometry(0.35 * scale, 24),
      new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide })
    );
    silhouette.position.set(0, 0.1 * scale, 0.001);
    targetGroup.add(silhouette);

    const ringColors = [0xcc2222, 0xffffff, 0xcc2222, 0xffffff, 0xcc2222];
    const ringRadii = [0.32, 0.25, 0.18, 0.12, 0.06].map((r) => r * scale);
    ringRadii.forEach((radius, i) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(i < ringRadii.length - 1 ? ringRadii[i + 1] : 0, radius, 32),
        new THREE.MeshBasicMaterial({ color: ringColors[i], side: THREE.DoubleSide })
      );
      ring.position.z = 0.002 * (i + 1);
      targetGroup.add(ring);
    });

    const hitMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0 * scale, 1.2 * scale),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    hitMesh.userData.isTarget = true;
    hitMesh.userData.points = Math.round(10 * scale * 10);
    hitMesh.userData.onHit = () => {
      paperMat.color.setHex(0xffee88);
      setTimeout(() => paperMat.color.setHex(0xf8f4ec), 100);
    };
    targetGroup.add(hitMesh);
    this.targets.push(hitMesh);

    frameGroup.add(targetGroup);
    this.targetGroups.push(frameGroup);
    this.scene.add(frameGroup);
  }

  _createSteelTarget(x, z, scale) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.6, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x555560, metalness: 0.5, roughness: 0.5 })
    );
    stand.position.y = 0.8;
    group.add(stand);

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35 * scale, 0.35 * scale, 0.04, 24),
      new THREE.MeshStandardMaterial({ color: 0x888890, metalness: 0.85, roughness: 0.25 })
    );
    plate.rotation.x = Math.PI / 2;
    plate.position.set(0, 1.3, 0.05);
    plate.castShadow = true;
    group.add(plate);

    const hitMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.35 * scale, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.rotation.x = -Math.PI / 2;
    hitMesh.position.set(0, 1.3, 0.08);
    hitMesh.userData.isTarget = true;
    hitMesh.userData.points = 25;
    hitMesh.userData.onHit = () => {
      plate.material.emissive.setHex(0xff6622);
      plate.material.emissiveIntensity = 0.6;
      setTimeout(() => { plate.material.emissiveIntensity = 0; }, 80);
    };
    group.add(hitMesh);
    this.targets.push(hitMesh);
    this.targetGroups.push(group);
    this.scene.add(group);
  }

  /**
   * _createBootTarget — Full-body human silhouette (boot / IPSC style).
   * Scored zones: head (50 pts), torso (30 pts), legs (10 pts).
   */
  _createBootTarget(x, z, scale) {
    const frameMat  = new THREE.MeshStandardMaterial({ color: 0x6b4f20, roughness: 0.85 });
    const bodyMat   = new THREE.MeshStandardMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const zoneMat   = new THREE.MeshBasicMaterial({ color: 0xcc2222, side: THREE.DoubleSide });
    const hitMat    = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.userData.swing = false;

    // ── Frame posts ──────────────────────────────────────────────
    [-0.35 * scale, 0.35 * scale].forEach((px) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.1, 0.09), frameMat);
      post.position.set(px * 2, 1.05, 0);
      post.castShadow = true;
      group.add(post);
    });
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(1.5 * scale, 0.08, 0.08), frameMat);
    topBar.position.set(0, 2.08, 0);
    group.add(topBar);
    const baseBar = new THREE.Mesh(new THREE.BoxGeometry(1.5 * scale, 0.06, 0.06), frameMat);
    baseBar.position.set(0, 0.06, 0);
    group.add(baseBar);

    const tgt = new THREE.Group();
    tgt.position.set(0, 0.12, 0.07);
    group.add(tgt);

    // ── Full silhouette body (dark backing) ──────────────────────
    // Legs
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.42 * scale, 0.78 * scale, 0.01),
      bodyMat
    );
    legs.position.set(0, 0.39 * scale, 0);
    tgt.add(legs);

    // Torso
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.52 * scale, 0.72 * scale, 0.01),
      bodyMat
    );
    torso.position.set(0, (0.78 + 0.36) * scale, 0);
    tgt.add(torso);

    // Head (circle)
    const head = new THREE.Mesh(
      new THREE.CircleGeometry(0.18 * scale, 20),
      bodyMat
    );
    head.position.set(0, (0.78 + 0.72 + 0.20) * scale, 0.001);
    tgt.add(head);

    // ── Scoring zones (painted on top) ───────────────────────────
    // Head zone (small red circle) — 50 pts
    const headZone = new THREE.Mesh(
      new THREE.CircleGeometry(0.11 * scale, 20),
      new THREE.MeshBasicMaterial({ color: 0xff2222, side: THREE.DoubleSide })
    );
    headZone.position.set(0, (0.78 + 0.72 + 0.20) * scale, 0.003);
    tgt.add(headZone);

    // Torso zone (red A-zone) — 30 pts
    const torsoZone = new THREE.Mesh(
      new THREE.BoxGeometry(0.30 * scale, 0.48 * scale, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xcc2222, side: THREE.DoubleSide })
    );
    torsoZone.position.set(0, (0.78 + 0.36) * scale, 0.003);
    tgt.add(torsoZone);

    // ── Hit meshes (invisible raycaster targets) ──────────────────
    // Head hit
    const headHit = new THREE.Mesh(
      new THREE.CircleGeometry(0.18 * scale, 16), hitMat.clone()
    );
    headHit.position.copy(headZone.position);
    headHit.position.z = 0.01;
    headHit.userData.isTarget = true;
    headHit.userData.points = 50;
    headHit.userData.zone = 'HEAD';
    headHit.userData.onHit = () => {
      headZone.material.color.setHex(0xffee00);
      setTimeout(() => headZone.material.color.setHex(0xff2222), 120);
    };
    tgt.add(headHit);
    this.targets.push(headHit);

    // Torso hit
    const torsoHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.52 * scale, 0.72 * scale, 0.01), hitMat.clone()
    );
    torsoHit.position.copy(torso.position);
    torsoHit.position.z = 0.01;
    torsoHit.userData.isTarget = true;
    torsoHit.userData.points = 30;
    torsoHit.userData.zone = 'TORSO';
    torsoHit.userData.onHit = () => {
      torsoZone.material.color.setHex(0xffee00);
      setTimeout(() => torsoZone.material.color.setHex(0xcc2222), 120);
    };
    tgt.add(torsoHit);
    this.targets.push(torsoHit);

    // Legs hit
    const legsHit = new THREE.Mesh(
      new THREE.BoxGeometry(0.42 * scale, 0.78 * scale, 0.01), hitMat.clone()
    );
    legsHit.position.copy(legs.position);
    legsHit.position.z = 0.01;
    legsHit.userData.isTarget = true;
    legsHit.userData.points = 10;
    legsHit.userData.zone = 'LEGS';
    legsHit.userData.onHit = () => {
      legs.material.color.setHex(0x888888);
      setTimeout(() => legs.material.color.setHex(0x111111), 120);
    };
    tgt.add(legsHit);
    this.targets.push(legsHit);

    this.targetGroups.push(group);
    this.scene.add(group);
  }

  _buildProps() {
    // ── Ammo boxes (military green) ─────────────────────────────
    const canMat   = new THREE.MeshStandardMaterial({ color: 0x3e5028, metalness: 0.45, roughness: 0.65 });
    const boxMat   = new THREE.MeshStandardMaterial({ color: 0x4a5a30, metalness: 0.3,  roughness: 0.8 });
    // Ammo cans on bench
    [[-1.6, 4.3], [1.4, 4.45], [-1.0, 4.3]].forEach(([x, z]) => {
      const can = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.1), canMat);
      can.position.set(x, 1.13, z);
      this.scene.add(can);
    });

    // Stacked ammo crates near the back
    [[1.8, 3.5], [1.8, 3.5]].forEach(([x, z], i) => {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.28), boxMat);
      crate.position.set(x, 0.14 + i * 0.29, z);
      this.scene.add(crate);
      // crate bands
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.022, 0.30),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 }));
      band.position.copy(crate.position);
      band.position.y += 0.06;
      this.scene.add(band);
    });

    // ── Sandbag barrier (left side) ─────────────────────────────
    const sandMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.98, metalness: 0 });
    for (let i = 0; i < 3; i++) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.20), sandMat);
      bag.position.set(-2.1, 0.09 + 0, 3.8 + i * 0.22);
      bag.rotation.y = (i % 2) * 0.12;
      this.scene.add(bag);
    }
    for (let i = 0; i < 2; i++) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.20), sandMat);
      bag.position.set(-2.1 + 0.16, 0.26, 3.9 + i * 0.25);
      bag.rotation.y = 0.08;
      this.scene.add(bag);
    }

    // ── Range flag (animated) ────────────────────────────────────
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 3.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x777788, metalness: 0.75 })
    );
    pole.position.set(-4.2, 1.75, 8);
    this.scene.add(pole);

    const flagGeo = new THREE.PlaneGeometry(1.0, 0.62, 6, 1);
    this.flagMesh = new THREE.Mesh(flagGeo,
      new THREE.MeshStandardMaterial({ color: 0xcc2020, side: THREE.DoubleSide, roughness: 0.8 })
    );
    this.flagMesh.position.set(-3.7, 3.2, 8);
    this.scene.add(this.flagMesh);

    // ── Barrels and Concrete Barricades (Down Range) ─────────────
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.6, roughness: 0.4 });
    const rustMat   = new THREE.MeshStandardMaterial({ color: 0x993300, metalness: 0.8, roughness: 0.8 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x888890, roughness: 0.95 });
    
    // Concrete barricades
    [[1.5, 35], [-1.8, 65], [1.2, 85]].forEach(([x, z], i) => {
      const barricade = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.4), concreteMat);
      barricade.position.set(x, 0.4, z);
      barricade.rotation.y = (i % 2 === 0) ? 0.1 : -0.15;
      barricade.castShadow = true;
      this.scene.add(barricade);
    });

    // Barrels
    [[-1.5, 30], [-1.2, 30.5], [1.8, 55], [-1.0, 80], [0.5, 90]].forEach(([x, z], i) => {
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.85, 16),
        i % 2 === 0 ? barrelMat : rustMat
      );
      barrel.position.set(x, 0.425, z);
      barrel.castShadow = true;
      this.scene.add(barrel);
    });

    // ── Warning / Danger signs ───────────────────────────────────
    const dangerMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x885500, emissiveIntensity: 0.15 });
    const danger = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.62, 0.05), dangerMat);
    danger.position.set(3.5, 1.3, 8);
    danger.rotation.y = -Math.PI / 5;
    this.scene.add(danger);

    const stopMat = new THREE.MeshStandardMaterial({ color: 0xdd2222, emissive: 0x660000, emissiveIntensity: 0.2 });
    const stop = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.04), stopMat);
    stop.position.set(-4.2, 1.3, 3.5);
    stop.rotation.y = Math.PI / 4;
    this.scene.add(stop);

    // ── Spent brass pile on bench ────────────────────────────────
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc8a020, metalness: 0.9, roughness: 0.18 });
    for (let i = 0; i < 12; i++) {
      const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.016, 5), brassMat);
      casing.position.set(
        -0.5 + Math.random() * 1.0,
        1.115,
        4.1 + Math.random() * 0.3
      );
      casing.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
      this.scene.add(casing);
    }

    // ── Target distance number boards ───────────────────────────
    const numMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    [{ z: 20, label: '25m' }, { z: 40, label: '50m' }, { z: 60, label: '100m' }].forEach(({ z }) => {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.04), numMat);
      board.position.set(2.3, 0.9, z - 1);
      board.rotation.y = -Math.PI / 6;
      this.scene.add(board);
    });
  }
}
