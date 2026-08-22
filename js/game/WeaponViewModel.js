/**
 * WeaponViewModel.js — Professional FPS Arms & Weapons
 *
 * Detailed viewmodels with tactical-gloved hands gripping each weapon.
 * Rendered in a dedicated pass so weapons always appear in front of the world.
 * Includes dynamic muzzle flash point light.
 */

import * as THREE from 'three';

function mat(color, opts = {}) {
  const params = {
    color,
    roughness: opts.roughness ?? 0.5,
    metalness: opts.metalness ?? 0.3,
  };
  if (opts.emissive !== undefined) {
    params.emissive = new THREE.Color(opts.emissive);
    params.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  return new THREE.MeshStandardMaterial(params);
}

export class WeaponViewModel {
  constructor(camera) {
    this.camera = camera;

    // Separate scene for viewmodel — rendered after world with depth clear
    this.scene = new THREE.Scene();

    this.rig = new THREE.Group();
    this.scene.add(this.rig);

    // Dedicated lighting so weapons are always well-lit
    const key = new THREE.DirectionalLight(0xfff8f0, 2.2);
    key.position.set(1, 3, 2);
    this.rig.add(key);
    const fill = new THREE.DirectionalLight(0xaabbff, 0.8);
    fill.position.set(-2, 0, 1);
    this.rig.add(fill);
    const under = new THREE.DirectionalLight(0x334455, 0.4);
    under.position.set(0, -2, 1);
    this.rig.add(under);
    this.rig.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Dynamic muzzle flash point light
    this.muzzleLight = new THREE.PointLight(0xff8822, 0, 4);
    this.rig.add(this.muzzleLight);

    this.weapons = [
      this._buildRig('ak47', this._buildAK47()),
      this._buildRig('pistol', this._buildPistol()),
      this._buildRig('smg', this._buildSMG()),
      this._buildRig('shotgun', this._buildShotgun()),
    ];

    this.currentIndex = 0;
    this.recoilZ    = 0;
    this.recoilRot  = 0;
    this.swayTime   = 0;
    this.switchAnim = 0;
    this.reloadAnim = 0;
    this.isReloading = false;
    this.muzzleLightTimer = 0;
    this.isADS = false;
    this.adsAnim = 0;

    this.weapons.forEach((w, i) => { w.visible = i === 0; });
    this._applyTransform();
  }

  /** Attach rig transform to camera each frame */
  syncToCamera() {
    this.rig.position.copy(this.camera.position);
    this.rig.quaternion.copy(this.camera.quaternion);
  }

  /** Render viewmodel pass on top of world */
  render(renderer, _camera) {
    this.syncToCamera();
    const prevAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = prevAutoClear;
  }

  getMuzzleWorldPosition() {
    const w = this.weapons[this.currentIndex];
    const muzzle = w.getObjectByName('muzzle');
    const pos = new THREE.Vector3();
    if (muzzle) muzzle.getWorldPosition(pos);
    else this.camera.getWorldPosition(pos);
    return pos;
  }

  showWeapon(index) {
    if (index < 0 || index >= this.weapons.length || index === this.currentIndex) return;
    this.weapons[this.currentIndex].visible = false;
    this.currentIndex = index;
    this.weapons[this.currentIndex].visible = true;
    this.switchAnim = 1;
    this.endReload(); // Cancel reload on switch
  }

  applyRecoil(strength = 1) {
    // Reduce recoil if ADS is fully active
    const recoilMod = 1.0 - (this.adsAnim * 0.4);
    this.recoilZ   = 0.11 * strength * recoilMod;
    this.recoilRot = 0.18 * strength * recoilMod;
  }

  flashMuzzleLight() {
    this.muzzleLightTimer = 0.08;
    this.muzzleLight.intensity = 6;
  }

  startReload() {
    this.isReloading = true;
    this.reloadAnim  = 0;
  }

  endReload() {
    this.isReloading = false;
  }

  update(delta, isMoving, bobTimer, isADS) {
    this.isADS = isADS;
    this.swayTime  += delta;
    this.recoilZ    = Math.max(0, this.recoilZ   - delta * 0.55);
    this.recoilRot  = Math.max(0, this.recoilRot  - delta * 0.9);
    if (this.switchAnim > 0) this.switchAnim = Math.max(0, this.switchAnim - delta * 3.0);
    if (this.isReloading)    this.reloadAnim = Math.min(1, this.reloadAnim + delta * 1.8);

    // Lerp ADS animation
    if (this.isADS && !this.isReloading && this.switchAnim === 0) {
      this.adsAnim = Math.min(1, this.adsAnim + delta * 5.0);
    } else {
      this.adsAnim = Math.max(0, this.adsAnim - delta * 5.0);
    }

    // Decay muzzle point light
    if (this.muzzleLightTimer > 0) {
      this.muzzleLightTimer -= delta;
      const t = Math.max(0, this.muzzleLightTimer / 0.08);
      this.muzzleLight.intensity = t * 6;
      // Position light at muzzle
      const muzzle = this.weapons[this.currentIndex].getObjectByName('muzzle');
      if (muzzle) {
        const wp = new THREE.Vector3();
        muzzle.getWorldPosition(wp);
        this.muzzleLight.position.copy(wp).sub(this.rig.position);
      }
    } else {
      this.muzzleLight.intensity = 0;
    }

    this._applyTransform(isMoving, bobTimer);
  }

  _applyTransform(isMoving = false, bobTimer = 0) {
    const w = this.weapons[this.currentIndex];
    if (!w) return;

    // Reduce sway and bob if ADS
    const swayMod = 1.0 - (this.adsAnim * 0.8);
    const swayX      = Math.sin(this.swayTime * 1.1) * 0.014 * swayMod;
    const swayY      = Math.cos(this.swayTime * 0.85) * 0.011 * swayMod;
    const bob        = isMoving ? Math.sin(bobTimer) * 0.028 * swayMod : 0;
    const switchDrop = this.switchAnim * 0.35;
    const reloadTilt = this.isReloading ? this.reloadAnim * 0.65 : 0;

    // Hipfire positions
    const hipX = 0.32;
    const hipY = -0.32;
    const hipZ = -0.38;
    const hipRotX = -0.04;
    const hipRotY = 0.12;
    const hipRotZ = 0.05;

    // ADS positions (centered)
    let adsX = 0;
    let adsY = -0.18;
    let adsZ = -0.25;
    let adsRotX = 0;
    let adsRotY = 0;
    let adsRotZ = 0;

    // Per-weapon ADS offsets
    if (w.name === 'ak47') {
      adsY = -0.155;
      adsZ = -0.22;
    } else if (w.name === 'pistol') {
      adsY = -0.165;
      adsZ = -0.28;
    } else if (w.name === 'smg') {
      adsY = -0.170;
      adsZ = -0.20;
    } else if (w.name === 'shotgun') {
      adsY = -0.160;
      adsZ = -0.24;
    }

    // Blend positions
    const currentX = THREE.MathUtils.lerp(hipX, adsX, this.adsAnim);
    const currentY = THREE.MathUtils.lerp(hipY, adsY, this.adsAnim);
    const currentZ = THREE.MathUtils.lerp(hipZ, adsZ, this.adsAnim);
    const currentRotX = THREE.MathUtils.lerp(hipRotX, adsRotX, this.adsAnim);
    const currentRotY = THREE.MathUtils.lerp(hipRotY, adsRotY, this.adsAnim);
    const currentRotZ = THREE.MathUtils.lerp(hipRotZ, adsRotZ, this.adsAnim);

    w.position.set(
      currentX + swayX,
      currentY + swayY + bob - switchDrop - reloadTilt * 0.35,
      currentZ + this.recoilZ
    );
    w.rotation.set(
      currentRotX - this.recoilRot - reloadTilt,
      currentRotY + swayX * 1.8,
      currentRotZ + swayY
    );
    w.scale.setScalar(1.18); // slightly larger for better visibility
  }

  _buildRig(name, weaponGroup) {
    const rig = new THREE.Group();
    rig.name = name;

    const hands = this._buildHands(name);
    rig.add(weaponGroup);
    rig.add(hands);

    this.rig.add(rig);
    return rig;
  }

  /** Tactical gloved hands — detailed, prominently visible */
  _buildHands(weaponType) {
    const group  = new THREE.Group();
    const glove  = mat(0x111111, { roughness: 0.88, metalness: 0.05 });
    const knuckle= mat(0x1c1c1c, { roughness: 0.85, metalness: 0.08 });
    const sleeve = mat(0x2e3d2e, { roughness: 0.92, metalness: 0 });
    const seam   = mat(0x0a0a0a, { roughness: 1.0,  metalness: 0 });

    // ── Right forearm ────────────────────────────────────────────
    const rForearm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.28), sleeve);
    rForearm.position.set(0.14, -0.04, 0.10);
    rForearm.rotation.set(0.38, -0.18, 0.08);
    group.add(rForearm);

    // Right wrist
    const rWrist = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.065), glove);
    rWrist.position.set(0.08, -0.08, -0.01);
    rWrist.rotation.set(0.42, -0.12, 0.05);
    group.add(rWrist);

    // Right palm
    const rPalm = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.095, 0.075), glove);
    rPalm.position.set(0.065, -0.115, -0.055);
    rPalm.rotation.set(0.5, 0, 0);
    group.add(rPalm);

    // Knuckle ridge on right hand
    const rKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.014, 0.025), knuckle);
    rKnuckle.position.set(0.065, -0.07, -0.095);
    rKnuckle.rotation.set(0.5, 0, 0);
    group.add(rKnuckle);

    // Right fingers (4 individual)
    for (let i = 0; i < 4; i++) {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.028, 0.038), glove);
      finger.position.set(0.032 + i * 0.016, -0.148, -0.072);
      finger.rotation.set(0.55, 0, 0);
      group.add(finger);
      // fingertip
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.016), knuckle);
      tip.position.set(0.032 + i * 0.016, -0.168, -0.086);
      tip.rotation.set(0.55, 0, 0);
      group.add(tip);
    }

    // Trigger finger (index, slightly extended)
    const trigFinger = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.025, 0.042), glove);
    trigFinger.position.set(0.065, -0.11, -0.09);
    trigFinger.rotation.set(0.2, 0, 0.05);
    group.add(trigFinger);

    // Right thumb
    const rThumb = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.018, 0.045), glove);
    rThumb.position.set(0.032, -0.095, -0.038);
    rThumb.rotation.set(0.4, 0.5, 0.3);
    group.add(rThumb);

    // Glove seam detail on right hand
    const rSeam = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.08, 0.002), seam);
    rSeam.position.set(0.106, -0.115, -0.055);
    group.add(rSeam);

    // ── Left arm (support hand — varies per weapon) ──────────────
    const lForearm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.30), sleeve);
    const lWrist   = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.072, 0.06), glove);
    const lPalm    = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.07), glove);

    if (weaponType === 'ak47') {
      lForearm.position.set(-0.05, -0.02, -0.18);
      lForearm.rotation.set(0.08, 0.28, 0.52);
      lWrist.position.set(-0.09, -0.06, -0.30);
      lWrist.rotation.set(0.18, 0.22, 0.38);
      lPalm.position.set(-0.10, -0.09, -0.34);
      lPalm.rotation.set(0.22, 0.18, 0.30);

      // AK support fingers
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.026, 0.036), glove);
        f.position.set(-0.082 - i * 0.008, -0.115, -0.352);
        f.rotation.set(0.3, 0.18, 0.3);
        group.add(f);
      }
    } else if (weaponType === 'pistol') {
      lForearm.visible = false;
      lWrist.visible   = false;
      lPalm.visible    = false;
      // Two-hand pistol grip — left supports right from below
      const lSupport = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.08, 0.075), glove);
      lSupport.position.set(0.092, -0.135, -0.048);
      lSupport.rotation.set(0.58, 0, -0.22);
      group.add(lSupport);
      const lSupportKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.014, 0.025), knuckle);
      lSupportKnuckle.position.set(0.092, -0.098, -0.062);
      group.add(lSupportKnuckle);
      const lThumb = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.015, 0.04), glove);
      lThumb.position.set(0.052, -0.11, -0.04);
      lThumb.rotation.set(0.4, -0.5, -0.3);
      group.add(lThumb);
    } else if (weaponType === 'shotgun') {
      // Shotgun — pump grip: left hand wraps around the forestock
      lForearm.position.set(-0.02, -0.025, -0.22);
      lForearm.rotation.set(0.05, 0.12, 0.48);
      lWrist.position.set(-0.06, -0.07, -0.34);
      lWrist.rotation.set(0.12, 0.10, 0.30);
      lPalm.position.set(-0.068, -0.105, -0.38);
      lPalm.rotation.set(0.15, 0.08, 0.25);
      // Pump-grip fingers (wrapping the forestock)
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.028, 0.040), glove);
        f.position.set(-0.054 - i * 0.009, -0.132, -0.395);
        f.rotation.set(0.20, 0.10, 0.26);
        group.add(f);
      }
      // Left thumb on pump
      const lThumbSG = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.018, 0.048), glove);
      lThumbSG.position.set(-0.028, -0.092, -0.362);
      lThumbSG.rotation.set(0.35, 0.45, 0.28);
      group.add(lThumbSG);
    } else {
      // SMG — left hand on foregrip area
      lForearm.position.set(-0.03, -0.03, -0.16);
      lForearm.rotation.set(0.12, 0.18, 0.42);
      lWrist.position.set(-0.07, -0.07, -0.26);
      lWrist.rotation.set(0.15, 0.15, 0.28);
      lPalm.position.set(-0.08, -0.10, -0.30);
      lPalm.rotation.set(0.18, 0.12, 0.22);
      // SMG support fingers
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.026, 0.035), glove);
        f.position.set(-0.065 - i * 0.007, -0.128, -0.315);
        f.rotation.set(0.25, 0.12, 0.22);
        group.add(f);
      }
    }

    group.add(lForearm);
    group.add(lWrist);
    group.add(lPalm);

    return group;
  }

  _buildAK47() {
    const g        = new THREE.Group();
    const gunMetal = mat(0x28282c, { metalness: 0.90, roughness: 0.25 });
    const gunDark  = mat(0x18181a, { metalness: 0.95, roughness: 0.20 });
    const wood     = mat(0x5e3a1f, { roughness: 0.85, metalness: 0.08 });
    const woodDark = mat(0x4a2c15, { roughness: 0.88, metalness: 0.05 });
    const chrome   = mat(0x9a9aa8, { metalness: 0.98, roughness: 0.08 });

    // Receiver body
    g.add(this._mesh(new THREE.BoxGeometry(0.048, 0.095, 0.44), gunMetal, [0, 0, -0.05]));
    // Top cover (slightly lighter)
    g.add(this._mesh(new THREE.BoxGeometry(0.042, 0.022, 0.40), gunDark, [0, 0.057, -0.06]));
    // Barrel
    g.add(this._mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.46, 12), gunDark, [0, 0.028, -0.46], [Math.PI / 2, 0, 0]));
    // Muzzle brake / compensator
    g.add(this._mesh(new THREE.CylinderGeometry(0.019, 0.016, 0.055, 10), chrome, [0, 0.028, -0.70], [Math.PI / 2, 0, 0]));
    // Muzzle slots (detail)
    for (let i = 0; i < 3; i++) {
      g.add(this._mesh(new THREE.BoxGeometry(0.042, 0.008, 0.006), gunDark, [0, 0.036, -0.685 - i * 0.012]));
    }
    // Gas tube
    g.add(this._mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.30, 8), gunMetal, [0, 0.06, -0.30], [Math.PI / 2, 0, 0]));
    // Gas block
    g.add(this._mesh(new THREE.BoxGeometry(0.022, 0.022, 0.03), gunDark, [0, 0.038, -0.44]));
    // Handguard (wood, two-piece look)
    g.add(this._mesh(new THREE.BoxGeometry(0.050, 0.038, 0.25), wood, [0, 0.008, -0.23]));
    g.add(this._mesh(new THREE.BoxGeometry(0.046, 0.028, 0.25), woodDark, [0, -0.022, -0.23]));
    // Magazine (curved)
    const mag = this._mesh(new THREE.BoxGeometry(0.030, 0.16, 0.080), gunDark, [0, -0.125, -0.02]);
    mag.rotation.x = 0.22;
    g.add(mag);
    // Magazine curve taper
    const magBot = this._mesh(new THREE.BoxGeometry(0.028, 0.04, 0.065), gunMetal, [0, -0.20, -0.045]);
    magBot.rotation.x = 0.45;
    g.add(magBot);
    // Stock (wood)
    g.add(this._mesh(new THREE.BoxGeometry(0.040, 0.080, 0.22), wood, [0, 0.015, 0.21]));
    g.add(this._mesh(new THREE.BoxGeometry(0.036, 0.040, 0.04), woodDark, [0, -0.018, 0.30])); // butt pad
    // Pistol grip
    const grip = this._mesh(new THREE.BoxGeometry(0.034, 0.115, 0.048), mat(0x151515, { roughness: 0.95 }), [0, -0.098, 0.055]);
    grip.rotation.x = 0.38;
    g.add(grip);
    // Trigger guard
    g.add(this._mesh(new THREE.TorusGeometry(0.026, 0.004, 6, 14, Math.PI), gunMetal, [0, -0.055, 0.022], [Math.PI / 2, 0, 0]));
    // Trigger
    g.add(this._mesh(new THREE.BoxGeometry(0.006, 0.028, 0.008), chrome, [0, -0.048, 0.01]));
    // Front sight post
    g.add(this._mesh(new THREE.BoxGeometry(0.016, 0.032, 0.016), gunDark, [0, 0.056, -0.52]));
    g.add(this._mesh(new THREE.BoxGeometry(0.006, 0.018, 0.006), chrome, [0, 0.072, -0.52]));
    // Rear sight leaf
    g.add(this._mesh(new THREE.BoxGeometry(0.028, 0.022, 0.014), gunDark, [0, 0.078, -0.06]));
    // Charging handle
    g.add(this._mesh(new THREE.BoxGeometry(0.014, 0.012, 0.028), gunMetal, [0.028, 0.042, 0.04]));
    // Selector switch
    g.add(this._mesh(new THREE.BoxGeometry(0.006, 0.020, 0.038), gunDark, [0.026, 0.000, 0.01]));

    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzle';
    muzzle.position.set(0, 0.028, -0.73);
    g.add(muzzle);
    return g;
  }

  _buildPistol() {
    const g        = new THREE.Group();
    const gunMetal = mat(0x404048, { metalness: 0.95, roughness: 0.15 });
    const gunDark  = mat(0x1e1e24, { metalness: 0.90, roughness: 0.20 });
    const chrome   = mat(0x9a9aa8, { metalness: 0.98, roughness: 0.08 });
    const grip     = mat(0x111111, { roughness: 0.90, metalness: 0.05 });

    // Slide
    g.add(this._mesh(new THREE.BoxGeometry(0.034, 0.046, 0.21), gunMetal, [0, 0.026, -0.11]));
    // Slide top flat
    g.add(this._mesh(new THREE.BoxGeometry(0.028, 0.006, 0.18), gunDark, [0, 0.050, -0.11]));
    // Ejection port
    g.add(this._mesh(new THREE.BoxGeometry(0.036, 0.018, 0.055), gunMetal, [0, 0.030, -0.10]));
    // Slide serrations (rear)
    for (let i = 0; i < 6; i++) {
      g.add(this._mesh(new THREE.BoxGeometry(0.001, 0.038, 0.010), gunDark, [0.017, 0.026, -0.03 - i * 0.022]));
    }
    // Frame
    g.add(this._mesh(new THREE.BoxGeometry(0.032, 0.058, 0.115), gunDark, [0, -0.005, -0.035]));
    // Grip panels
    const gp = this._mesh(new THREE.BoxGeometry(0.030, 0.105, 0.044), grip, [0, -0.068, 0.024]);
    gp.rotation.x = 0.24;
    g.add(gp);
    // Grip texture lines
    for (let i = 0; i < 8; i++) {
      g.add(this._mesh(new THREE.BoxGeometry(0.032, 0.002, 0.042), mat(0x0a0a0a, { roughness: 1 }), [0, -0.038 - i * 0.011, 0.022]));
    }
    // Trigger guard underrail
    g.add(this._mesh(new THREE.BoxGeometry(0.028, 0.010, 0.04), gunDark, [0, -0.038, -0.062]));
    // Barrel
    g.add(this._mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.05, 10), gunDark, [0, 0.030, -0.235], [Math.PI / 2, 0, 0]));
    // Front sight
    g.add(this._mesh(new THREE.BoxGeometry(0.005, 0.014, 0.005), chrome, [0, 0.050, -0.200]));
    // Rear sight
    g.add(this._mesh(new THREE.BoxGeometry(0.022, 0.010, 0.007), gunDark, [0, 0.050, -0.025]));
    // Rear sight dots
    g.add(this._mesh(new THREE.SphereGeometry(0.003, 4, 4), mat(0xffffff, { roughness: 0.1 }), [-0.007, 0.052, -0.025]));
    g.add(this._mesh(new THREE.SphereGeometry(0.003, 4, 4), mat(0xffffff, { roughness: 0.1 }), [ 0.007, 0.052, -0.025]));
    // Hammer
    g.add(this._mesh(new THREE.BoxGeometry(0.009, 0.018, 0.009), gunMetal, [0, 0.044, 0.042]));
    // Trigger
    g.add(this._mesh(new THREE.BoxGeometry(0.007, 0.028, 0.010), chrome, [0, -0.030, 0.010]));
    // Mag release
    g.add(this._mesh(new THREE.BoxGeometry(0.006, 0.010, 0.012), gunMetal, [0.017, -0.018, 0.008]));

    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzle';
    muzzle.position.set(0, 0.030, -0.262);
    g.add(muzzle);
    return g;
  }

  _buildSMG() {
    const g        = new THREE.Group();
    const gunMetal = mat(0x323238, { metalness: 0.88, roughness: 0.22 });
    const gunDark  = mat(0x17171c, { metalness: 0.92, roughness: 0.18 });
    const chrome   = mat(0x9a9aa8, { metalness: 0.98, roughness: 0.08 });
    const rd       = mat(0xcc1111, { roughness: 0.4,  emissive: 0xff0000, emissiveIntensity: 0.5 });

    // Upper receiver
    g.add(this._mesh(new THREE.BoxGeometry(0.040, 0.078, 0.34), gunMetal, [0, 0.002, -0.11]));
    // Lower receiver
    g.add(this._mesh(new THREE.BoxGeometry(0.036, 0.055, 0.26), gunDark, [0, -0.032, -0.09]));
    // Barrel shroud
    g.add(this._mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.24, 14), gunDark, [0, 0.020, -0.35], [Math.PI / 2, 0, 0]));
    // Barrel
    g.add(this._mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.28, 8), gunMetal, [0, 0.020, -0.35], [Math.PI / 2, 0, 0]));
    // Shroud ventilation holes
    for (let i = 0; i < 5; i++) {
      g.add(this._mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.044, 6), gunMetal, [0.020, 0.020, -0.25 - i * 0.038], [0, 0, Math.PI / 2]));
    }
    // Magazine (vertical)
    g.add(this._mesh(new THREE.BoxGeometry(0.024, 0.145, 0.058), gunDark, [0, -0.108, -0.058]));
    g.add(this._mesh(new THREE.BoxGeometry(0.020, 0.015, 0.052), gunMetal, [0, -0.183, -0.058])); // base plate
    // Pistol grip
    const gp = this._mesh(new THREE.BoxGeometry(0.032, 0.090, 0.040), mat(0x111111, { roughness: 0.94 }), [0, -0.080, 0.018]);
    gp.rotation.x = 0.30;
    g.add(gp);
    // Trigger guard
    g.add(this._mesh(new THREE.TorusGeometry(0.022, 0.003, 6, 12, Math.PI), gunMetal, [0, -0.050, 0.020], [Math.PI / 2, 0, 0]));
    // Trigger
    g.add(this._mesh(new THREE.BoxGeometry(0.006, 0.024, 0.007), chrome, [0, -0.046, 0.010]));
    // Folding stock (open)
    g.add(this._mesh(new THREE.BoxGeometry(0.008, 0.060, 0.16), gunMetal, [-0.028, 0.010, 0.14]));
    g.add(this._mesh(new THREE.BoxGeometry(0.008, 0.060, 0.16), gunMetal, [ 0.028, 0.010, 0.14]));
    g.add(this._mesh(new THREE.BoxGeometry(0.064, 0.012, 0.015), gunMetal, [0, -0.018, 0.215]));
    // Red dot sight body
    g.add(this._mesh(new THREE.BoxGeometry(0.026, 0.022, 0.055), gunDark, [0, 0.062, -0.028]));
    // Red dot lens
    g.add(this._mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 10), mat(0x113366, { roughness: 0.0, metalness: 1.0 }), [0, 0.074, -0.028]));
    // Red dot emitter
    g.add(this._mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.003, 8), rd, [0, 0.079, -0.028]));
    // Charging handle
    g.add(this._mesh(new THREE.BoxGeometry(0.010, 0.010, 0.024), gunMetal, [0.022, 0.030, 0.01]));

    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzle';
    muzzle.position.set(0, 0.020, -0.48);
    g.add(muzzle);
    return g;
  }

  _buildShotgun() {
    const g        = new THREE.Group();
    const gunMetal = mat(0x252525, { metalness: 0.88, roughness: 0.30 });
    const gunDark  = mat(0x141414, { metalness: 0.92, roughness: 0.22 });
    const wood     = mat(0x6b3e1e, { roughness: 0.88, metalness: 0.04 });
    const woodDark = mat(0x4e2c12, { roughness: 0.92, metalness: 0.03 });
    const chrome   = mat(0x9a9aa8, { metalness: 0.98, roughness: 0.08 });

    // ── Receiver body (boxy, chunky) ─────────────────────────────
    g.add(this._mesh(new THREE.BoxGeometry(0.058, 0.10, 0.40), gunMetal, [0, 0.005, -0.04]));
    // Top receiver flat
    g.add(this._mesh(new THREE.BoxGeometry(0.050, 0.018, 0.38), gunDark, [0, 0.058, -0.04]));

    // ── Barrel (thick 12-gauge tube) ─────────────────────────────
    g.add(this._mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 12), gunDark, [0, 0.040, -0.50], [Math.PI/2, 0, 0]));
    // Barrel heat shield (ventilated rib)
    g.add(this._mesh(new THREE.BoxGeometry(0.050, 0.010, 0.44), gunDark, [0, 0.064, -0.46]));
    for (let i = 0; i < 7; i++) {
      g.add(this._mesh(new THREE.BoxGeometry(0.052, 0.003, 0.006), gunMetal, [0, 0.072, -0.26 - i * 0.055]));
    }
    // Muzzle (front bead sight)
    g.add(this._mesh(new THREE.CylinderGeometry(0.026, 0.024, 0.035, 12), chrome, [0, 0.040, -0.760], [Math.PI/2, 0, 0]));
    // Front bead sight
    g.add(this._mesh(new THREE.SphereGeometry(0.005, 6, 6), chrome, [0, 0.070, -0.765]));

    // ── Magazine tube under barrel ────────────────────────────────
    g.add(this._mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.46, 10), gunMetal, [0, 0.008, -0.47], [Math.PI/2, 0, 0]));
    // Mag tube cap
    g.add(this._mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.020, 10), chrome, [0, 0.008, -0.72], [Math.PI/2, 0, 0]));

    // ── Pump / Forestock (slides on rails) ───────────────────────
    const pump = this._mesh(new THREE.BoxGeometry(0.056, 0.058, 0.16), wood, [0, -0.010, -0.38]);
    g.add(pump);
    // Pump grooves
    for (let i = 0; i < 5; i++) {
      g.add(this._mesh(new THREE.BoxGeometry(0.058, 0.005, 0.008), woodDark, [0, -0.005, -0.31 - i * 0.022]));
    }
    // Pump action rails (two metal bars)
    [-0.016, 0.016].forEach(x => {
      g.add(this._mesh(new THREE.BoxGeometry(0.005, 0.008, 0.30), gunMetal, [x, 0.005, -0.37]));
    });

    // ── Stock (wood, traditional) ────────────────────────────────
    g.add(this._mesh(new THREE.BoxGeometry(0.050, 0.088, 0.26), wood, [0, 0.010, 0.215]));
    // Stock wrist taper
    g.add(this._mesh(new THREE.BoxGeometry(0.048, 0.065, 0.06), woodDark, [0, -0.008, 0.125]));
    // Butt pad (rubber)
    g.add(this._mesh(new THREE.BoxGeometry(0.054, 0.095, 0.018), mat(0x0a0a0a, { roughness: 0.99 }), [0, 0.010, 0.342]));

    // ── Pistol grip ──────────────────────────────────────────────
    const grip = this._mesh(new THREE.BoxGeometry(0.038, 0.110, 0.052), mat(0x111111, { roughness: 0.96 }), [0, -0.088, 0.068]);
    grip.rotation.x = 0.35;
    g.add(grip);
    // Grip checkering
    for (let i = 0; i < 6; i++) {
      g.add(this._mesh(new THREE.BoxGeometry(0.040, 0.003, 0.050), mat(0x080808, { roughness: 1 }), [0, -0.048 - i * 0.014, 0.065]));
    }

    // ── Trigger guard + trigger ──────────────────────────────────
    g.add(this._mesh(new THREE.TorusGeometry(0.030, 0.005, 6, 14, Math.PI), gunMetal, [0, -0.050, 0.040], [Math.PI/2, 0, 0]));
    g.add(this._mesh(new THREE.BoxGeometry(0.008, 0.030, 0.010), chrome, [0, -0.044, 0.025]));

    // ── Action bar (ejection port) ────────────────────────────────
    g.add(this._mesh(new THREE.BoxGeometry(0.060, 0.025, 0.060), gunMetal, [0.000, 0.010, 0.010]));
    // Safety button
    g.add(this._mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.008, 8), mat(0xcc2222, { roughness: 0.4 }), [0, 0.060, 0.032], [Math.PI/2, 0, 0]));

    // ── Muzzle marker (for raycast origin) ───────────────────────
    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzle';
    muzzle.position.set(0, 0.040, -0.78);
    g.add(muzzle);
    return g;
  }

  _mesh(geo, material, pos, rot = [0, 0, 0]) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...pos);
    m.rotation.set(...rot);
    return m;
  }
}
