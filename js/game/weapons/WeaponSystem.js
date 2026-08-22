/**
 * WeaponSystem.js — Modular Weapon Manager
 */

import * as THREE from 'three';
import { AK47 } from './AK47.js';
import { Pistol } from './Pistol.js';
import { SMG } from './SMG.js';
import { Shotgun } from './Shotgun.js';

const RAYCAST_RANGE = 100;

export class WeaponSystem {
  constructor(camera, scene, audio, targets, weaponView, effects) {
    this.camera = camera;
    this.scene = scene;
    this.audio = audio;
    this.targets = targets;
    this.weaponView = weaponView;
    this.effects = effects;

    this.weapons = [new AK47(), new Pistol(), new SMG(), new Shotgun()];
    this.currentIndex = 0;
    this.currentWeapon = this.weapons[0];

    this.fireHeld = false;
    this.semiFireReleased = true;
    this._wasReloading = false;

    this.raycaster = new THREE.Raycaster();

    this.onHit = null;
    this.onFire = null;
    this.onAmmoChange = null;
    this.onWeaponChange = null;
    this.onReloadStart = null;
    this.onReloadEnd = null;
  }

  handleFireInput(isDown) {
    this.fireHeld = isDown;
    if (!isDown) this.semiFireReleased = true;
  }

  switchWeapon(index) {
    if (index < 0 || index >= this.weapons.length) return;
    if (index === this.currentIndex) return;

    this.currentIndex = index;
    this.currentWeapon = this.weapons[index];
    this.onWeaponChange?.(this.currentWeapon.name, index);
    this.onAmmoChange?.(
      this.currentWeapon.currentAmmo,
      this.currentWeapon.reserveAmmo
    );
  }

  reload() {
    const started = this.currentWeapon.startReload();
    if (started) {
      this.onReloadStart?.();
      this.audio.playReload();
    }
  }

  update(delta) {
    this.currentWeapon.update(delta);

    if (!this.currentWeapon.isReloading && this._wasReloading) {
      this.onReloadEnd?.();
      this.onAmmoChange?.(
        this.currentWeapon.currentAmmo,
        this.currentWeapon.reserveAmmo
      );
    }
    this._wasReloading = this.currentWeapon.isReloading;

    this._processFiring();
  }

  _processFiring() {
    const w = this.currentWeapon;
    if (w.isReloading) return;

    let shouldFire = false;
    if (w.fireMode === 'auto') {
      shouldFire = this.fireHeld;
    } else {
      shouldFire = this.fireHeld && this.semiFireReleased;
    }

    if (shouldFire && w.tryFire()) {
      this._fireShot();
      if (w.fireMode === 'semi') this.semiFireReleased = false;
    }

    if (w.currentAmmo <= 0 && !w.isReloading && w.reserveAmmo > 0) {
      this.reload();
    }
  }

  _fireShot() {
    const w = this.currentWeapon;

    const origin = this.weaponView.getMuzzleWorldPosition();
    const direction = w.getSpreadDirection(this.camera);

    this.raycaster.set(origin, direction);
    this.raycaster.far = RAYCAST_RANGE;

    // Update world matrices on target groups before raycast
    this.targets.forEach((t) => t.updateWorldMatrix(true, false));

    const hits = this.raycaster.intersectObjects(this.targets, false);
    let hitPoint = origin.clone().add(direction.clone().multiplyScalar(RAYCAST_RANGE));

    if (hits.length > 0) {
      const hit = hits[0];
      hitPoint = hit.point.clone();
      if (hit.object.userData.isTarget) {
        const normal = hit.normal
          ? hit.normal.clone().transformDirection(hit.object.matrixWorld)
          : new THREE.Vector3(0, 0, 1);
        this.onHit?.(hit.object, hit.point, normal, hit.object.userData.points || 10);
        this._spawnImpactMark(hit.point, normal);
      }
    }

    // Visual + audio feedback
    this.effects.spawnTracer(origin, hitPoint);
    this.effects.showMuzzleFlash();
    this.effects.spawnShellCasing();
    this.audio.playGunshot(w.name);
    this.onFire?.();
    this.onAmmoChange?.(w.currentAmmo, w.reserveAmmo);
  }

  _spawnImpactMark(point, normal) {
    const mark = new THREE.Mesh(
      new THREE.CircleGeometry(0.035, 8),
      new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide })
    );
    mark.position.copy(point).addScaledVector(normal, 0.008);
    mark.lookAt(point.clone().add(normal));
    this.scene.add(mark);
  }
}
