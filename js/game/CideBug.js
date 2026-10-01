/**
 * CideBug.js — Giant Cartoon Bug Boss Character ("CODE BUG")
 *
 * Features:
 *  - High-detail 3D cartoon bug character with big goofy eyes, antennae, wings, and boots.
 *  - Massive bold 3D floating title tag on its head ("CIDE BUG") with glowing graphics.
 *  - Full hit detection across all body parts with custom point scoring and feed messages.
 *  - Dynamic animations: idle bobbing, antenna wiggling, wing flapping, and squash-and-stretch hit wobble physics.
 */

import * as THREE from 'three';

export class CideBug {
  constructor(scene, position = new THREE.Vector3(0, 0, 45), scale = 2.0) {
    this.scene = scene;
    this.basePosition = position.clone();
    this.scale = scale;

    // Health state — ULTRA TANK BOSS (10,000 HP — Requires hundreds of rounds)
    this.maxHealth = 10000;
    this.health = 10000;
    this.isDead = false;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.scale.set(scale, scale, scale);
    this.group.rotation.y = Math.PI; // Face towards firing shelter / player side

    this.targetMeshes = [];
    this.materialsToFlash = [];

    // Animation state
    this.time = Math.random() * 100;
    this.wobble = 0;
    this.wobbleVelocity = 0;
    this.pupilOffset = new THREE.Vector2();

    this._buildCharacter();
    this.scene.add(this.group);
  }

  getTargetMeshes() {
    return this.targetMeshes;
  }

  takeDamage(amount) {
    if (this.isDead) return true;

    // Heavy Boss Armor (50% damage reduction)
    const damageDealt = Math.max(5, Math.floor(amount * 0.5));
    this.health = Math.max(0, this.health - damageDealt);

    if (this.health <= 0) {
      this.isDead = true;
      this._triggerDeath();
    }
    return this.isDead;
  }

  reset() {
    this.health = this.maxHealth;
    this.isDead = false;
    this.group.visible = true;
    this.group.scale.set(this.scale, this.scale, this.scale);
    this.group.position.copy(this.basePosition);
    this.group.rotation.set(0, Math.PI, 0);
    this.wobble = 0;
    this.wobbleVelocity = 0;
  }

  _triggerDeath() {
    this.wobbleVelocity = -12.0;
    this.wobble = -0.8;
    setTimeout(() => {
      if (this.isDead) {
        this.group.visible = false;
      }
    }, 500);
  }

  update(delta) {
    if (this.isDead) {
      this.group.scale.lerp(new THREE.Vector3(0.01, 0.01, 0.01), delta * 6.0);
      return;
    }

    this.time += delta;

    // ── 1. Idle Bobbing & Floating ─────────────────────────────────
    const floatY = Math.sin(this.time * 2.2) * 0.12;
    const breathe = 1.0 + Math.sin(this.time * 3.0) * 0.02;

    // ── 2. Hit Wobble Damping (Squash & Stretch) ───────────────────
    if (this.wobble > 0.001 || Math.abs(this.wobbleVelocity) > 0.001) {
      const springK = 120.0;
      const damping = 8.0;
      const accel = -springK * this.wobble - damping * this.wobbleVelocity;
      this.wobbleVelocity += accel * delta;
      this.wobble += this.wobbleVelocity * delta;
    } else {
      this.wobble = 0;
      this.wobbleVelocity = 0;
    }

    // Combine scale with wobble squash & stretch
    const scaleX = (1.0 + this.wobble * 0.3) * this.scale;
    const scaleY = (1.0 - this.wobble * 0.25) * this.scale * breathe;
    const scaleZ = (1.0 + this.wobble * 0.3) * this.scale;
    this.group.scale.set(scaleX, scaleY, scaleZ);
    this.group.position.y = this.basePosition.y + floatY;

    // ── 3. Antenna Wiggling ───────────────────────────────────────
    if (this.leftAntenna && this.rightAntenna) {
      this.leftAntenna.rotation.z = Math.sin(this.time * 4.5) * 0.15 + 0.3;
      this.rightAntenna.rotation.z = -Math.sin(this.time * 4.5 + 0.5) * 0.15 - 0.3;
    }

    // ── 4. Wing Flapping ───────────────────────────────────────────
    if (this.leftWing && this.rightWing) {
      this.leftWing.rotation.y = Math.sin(this.time * 8.0) * 0.25 + 0.3;
      this.rightWing.rotation.y = -Math.sin(this.time * 8.0) * 0.25 - 0.3;
    }

    // ── 5. Eyeball Goofy Rotation ──────────────────────────────────
    if (this.pupils) {
      const eyeRot = Math.sin(this.time * 1.5) * 0.1;
      this.pupils.forEach((p) => {
        p.rotation.z = eyeRot;
      });
    }

    // ── 6. Name Tag Float & Pulse ──────────────────────────────────
    if (this.nameTagGroup) {
      this.nameTagGroup.position.y = 4.3 + Math.sin(this.time * 3.5) * 0.08;
      if (this.nameTagGlow) {
        this.nameTagGlow.material.opacity = 0.6 + Math.sin(this.time * 5.0) * 0.2;
      }
    }
  }

  triggerHit(hitMesh, hitPoint) {
    // Add strong impulse to wobble
    this.wobbleVelocity = 4.5;
    this.wobble = 0.25;

    // Flash materials
    this.materialsToFlash.forEach((mat) => {
      if (mat.emissive) {
        const origColor = mat.emissive.getHex();
        const origIntensity = mat.emissiveIntensity;
        mat.emissive.setHex(0xff3300);
        mat.emissiveIntensity = 0.9;
        setTimeout(() => {
          mat.emissive.setHex(origColor);
          mat.emissiveIntensity = origIntensity;
        }, 120);
      }
    });

    // Eyeball spin on head hit
    if (hitMesh.userData.part === 'head' || hitMesh.userData.part === 'eye') {
      if (this.pupils) {
        this.pupils.forEach((p) => {
          p.rotation.z += Math.PI * 2;
        });
      }
    }
  }

  // ── Private Build Methods ────────────────────────────────────────

  _buildCharacter() {
    // Shared Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x34d399, // Vibrant emerald / lime green
      roughness: 0.35,
      metalness: 0.1,
    });
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0xfde047, // Bright yellow belly
      roughness: 0.4,
    });
    const spotMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7, // Cartoon purple spots
      roughness: 0.3,
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Bright red boots
      roughness: 0.3,
      metalness: 0.2,
    });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    this.materialsToFlash.push(skinMat, bellyMat);

    // Main Torso Container
    const bodyGroup = new THREE.Group();
    this.group.add(bodyGroup);

    // ── 1. Torso / Chest ───────────────────────────────────────────
    const chestGeo = new THREE.SphereGeometry(1.3, 32, 32);
    const chest = new THREE.Mesh(chestGeo, skinMat);
    chest.scale.set(1.1, 1.35, 1.0);
    chest.position.set(0, 1.5, 0);
    chest.castShadow = true;
    chest.receiveShadow = true;
    bodyGroup.add(chest);

    this._registerTarget(chest, 'torso', 25, '🐛 CODE BUG BODY HIT!');

    // Chubby Yellow Belly
    const bellyGeo = new THREE.SphereGeometry(1.05, 24, 24);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.scale.set(0.95, 1.15, 0.7);
    belly.position.set(0, 1.4, 0.45);
    belly.castShadow = true;
    bodyGroup.add(belly);

    this._registerTarget(belly, 'torso', 25, '🐛 CODE BUG BELLY HIT!');

    // Cartoon Spots on Back
    [
      [-0.5, 1.8, -0.7, 0.3],
      [0.5, 1.8, -0.7, 0.3],
      [0.0, 1.3, -0.8, 0.35],
      [-0.4, 0.9, -0.6, 0.25],
      [0.4, 0.9, -0.6, 0.25],
    ].forEach(([x, y, z, r]) => {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), spotMat);
      spot.scale.set(1, 1, 0.4);
      spot.position.set(x, y, z);
      bodyGroup.add(spot);
    });

    // ── 2. Head ────────────────────────────────────────────────────
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 3.0, 0.1);
    bodyGroup.add(headGroup);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 32), skinMat);
    headMesh.scale.set(1.1, 1.0, 1.05);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    this._registerTarget(headMesh, 'head', 50, '🎯 CODE BUG HEADSHOT!');

    // ── 3. Big Goofy Eyes ──────────────────────────────────────────
    this.pupils = [];
    [-0.45, 0.45].forEach((xEye, idx) => {
      // White sclera
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), whiteMat);
      sclera.position.set(xEye, 0.25, 0.85);
      headGroup.add(sclera);

      this._registerTarget(sclera, 'eye', 45, '👀 CODE BUG EYE POKE!');

      // Pupil
      const pupilGroup = new THREE.Group();
      pupilGroup.position.set(xEye, 0.25, 1.18);
      headGroup.add(pupilGroup);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), blackMat);
      pupil.scale.set(1, 1, 0.3);
      pupilGroup.add(pupil);

      // Glare highlight dot
      const glare = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      glare.position.set(0.06, 0.06, 0.12);
      pupilGroup.add(glare);

      this.pupils.push(pupilGroup);

      // Cute Arched Eyebrow
      const browGeo = new THREE.TorusGeometry(0.35, 0.05, 8, 16, Math.PI * 0.7);
      const brow = new THREE.Mesh(browGeo, blackMat);
      brow.position.set(xEye, 0.65, 0.95);
      brow.rotation.x = -0.3;
      brow.rotation.z = idx === 0 ? 0.2 : -0.2;
      headGroup.add(brow);
    });

    // ── 4. Goofy Smile & Teeth ─────────────────────────────────────
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.3, 0.95);
    headGroup.add(mouthGroup);

    // Black mouth cavity
    const cavity = new THREE.Mesh(
      new THREE.RingGeometry(0, 0.42, 24, 1, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x1e1b4b, side: THREE.DoubleSide })
    );
    cavity.rotation.x = Math.PI;
    cavity.position.set(0, 0, 0.02);
    mouthGroup.add(cavity);

    // Pink tongue
    const tongue = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 })
    );
    tongue.scale.set(1.2, 0.6, 0.8);
    tongue.position.set(0, -0.15, 0.08);
    mouthGroup.add(tongue);

    // Two funny front buck teeth
    [-0.1, 0.1].forEach((tx) => {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.04), whiteMat);
      tooth.position.set(tx, 0.02, 0.06);
      mouthGroup.add(tooth);
    });

    // ── 5. Antennae ────────────────────────────────────────────────
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4 });
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    this.materialsToFlash.push(bulbMat);

    // Left Antenna
    this.leftAntenna = new THREE.Group();
    this.leftAntenna.position.set(-0.35, 1.0, 0.2);
    headGroup.add(this.leftAntenna);

    const stemL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.4, 12), antennaMat);
    stemL.position.set(-0.25, 0.65, 0);
    stemL.rotation.z = 0.35;
    this.leftAntenna.add(stemL);

    const bulbL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), bulbMat);
    bulbL.position.set(-0.5, 1.35, 0);
    this.leftAntenna.add(bulbL);
    this._registerTarget(bulbL, 'antenna', 40, '⚡ CODE BUG ANTENNA HIT!');

    // Right Antenna
    this.rightAntenna = new THREE.Group();
    this.rightAntenna.position.set(0.35, 1.0, 0.2);
    headGroup.add(this.rightAntenna);

    const stemR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.4, 12), antennaMat);
    stemR.position.set(0.25, 0.65, 0);
    stemR.rotation.z = -0.35;
    this.rightAntenna.add(stemR);

    const bulbR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), bulbMat);
    bulbR.position.set(0.5, 1.35, 0);
    this.rightAntenna.add(bulbR);
    this._registerTarget(bulbR, 'antenna', 40, '⚡ CODE BUG ANTENNA HIT!');

    // ── 6. Wings (Back Elytra) ─────────────────────────────────────
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      roughness: 0.1,
    });

    this.leftWing = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), wingMat);
    this.leftWing.position.set(-0.7, 1.8, -0.6);
    this.leftWing.rotation.set(0.2, 0.4, -0.3);
    bodyGroup.add(this.leftWing);

    this.rightWing = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), wingMat);
    this.rightWing.position.set(0.7, 1.8, -0.6);
    this.rightWing.rotation.set(0.2, -0.4, 0.3);
    bodyGroup.add(this.rightWing);

    // ── 7. Cartoon Legs & Boots ────────────────────────────────────
    [
      [-0.8, 0, 0.2, -0.3],
      [0.8, 0, 0.2, 0.3],
      [-0.9, 0, -0.4, -0.4],
      [0.9, 0, -0.4, 0.4],
    ].forEach(([lx, ly, lz, rotZ]) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(lx, 0.8, lz);
      legGroup.rotation.z = rotZ;
      bodyGroup.add(legGroup);

      const legMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 1.0, 12),
        skinMat
      );
      legMesh.position.set(0, -0.4, 0);
      legGroup.add(legMesh);

      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.6), bootMat);
      boot.position.set(0, -0.85, 0.1);
      boot.castShadow = true;
      legGroup.add(boot);

      this._registerTarget(boot, 'boot', 20, '🥾 CODE BUG BOOT HIT!');
    });

    // ── 8. Cartoon Arms & Gloves ───────────────────────────────────
    [-1.0, 1.0].forEach((ax, idx) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(ax, 1.9, 0.1);
      armGroup.rotation.z = idx === 0 ? 0.6 : -0.6;
      bodyGroup.add(armGroup);

      const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.9, 12), skinMat);
      armMesh.position.set(0, -0.35, 0);
      armGroup.add(armMesh);

      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), whiteMat);
      glove.position.set(0, -0.75, 0);
      armGroup.add(glove);
    });

    // ── 9. GIANT NAME TAG ON HEAD ("CODE BUG") ─────────────────────
    this._buildNameTag(headGroup);
  }

  _buildNameTag(parentGroup) {
    this.nameTagGroup = new THREE.Group();
    // Mounted above head
    this.nameTagGroup.position.set(0, 2.5, 0);
    parentGroup.add(this.nameTagGroup);

    // Create Canvas Texture for High-Resolution Text "CODE BUG"
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 280;
    const ctx = canvas.getContext('2d');

    // Canvas Background Badge (Neon Pill Shape)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 14;

    const x = 20, y = 20, w = 984, h = 240, r = 50;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner Neon Accent Line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Text Shadow & Glow
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 30;

    // Big Bold Title Text
    ctx.font = '900 115px "Oswald", "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Black Stroke Outlines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 20;
    ctx.strokeText('🐛 CODE BUG 🐛', canvas.width / 2, canvas.height / 2);

    // Yellow / Gold Fill
    ctx.fillStyle = '#fef08a';
    ctx.fillText('🐛 CODE BUG 🐛', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    // Front & Back Double-Sided Mesh Banner
    const bannerGeo = new THREE.PlaneGeometry(3.6, 1.0);
    const bannerMat = new THREE.MeshStandardMaterial({
      map: texture,
      emissiveMap: texture,
      emissive: 0xffffff,
      emissiveIntensity: 0.75,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.2,
    });

    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.castShadow = true;
    this.nameTagGroup.add(bannerMesh);

    // Register Name Tag as a Target Zone!
    this._registerTarget(bannerMesh, 'nametag', 35, '🏷️ CODE BUG NAME TAG HIT!');

    // Decorative Glowing Orbs on Corners of the Sign Frame
    const orbGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.0,
    });
    [
      [-1.75, 0.45, 0.02],
      [1.75, 0.45, 0.02],
      [-1.75, -0.45, 0.02],
      [1.75, -0.45, 0.02],
    ].forEach(([ox, oy, oz]) => {
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(ox, oy, oz);
      this.nameTagGroup.add(orb);
    });

    // Background Glow Soft Plane
    const glowGeo = new THREE.PlaneGeometry(4.2, 1.5);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.nameTagGlow = new THREE.Mesh(glowGeo, glowMat);
    this.nameTagGlow.position.z = -0.05;
    this.nameTagGroup.add(this.nameTagGlow);

    // Metal Support Bracket attaching Sign to Head
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 12), poleMat);
    pole.position.set(0, -0.6, -0.1);
    this.nameTagGroup.add(pole);
  }

  _registerTarget(mesh, partName, points, feedMsg) {
    mesh.userData.isTarget = true;
    mesh.userData.characterName = 'CODE BUG';
    mesh.userData.part = partName;
    mesh.userData.points = points;
    mesh.userData.feedMsg = feedMsg;
    mesh.userData.onHit = (hitPoint) => this.triggerHit(mesh, hitPoint);

    this.targetMeshes.push(mesh);
  }
}
