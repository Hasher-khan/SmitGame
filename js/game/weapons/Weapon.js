/**
 * Weapon.js — Base Weapon Class
 *
 * All firearm classes extend this. Defines the interface for:
 *  - Fire rate & fire mode (semi / auto)
 *  - Recoil parameters
 *  - Ammo management
 *  - Raycast hit detection
 *  - Muzzle flash VFX
 */

import * as THREE from 'three';

export class Weapon {
  /**
   * @param {object} config - Weapon stat block
   */
  constructor(config) {
    this.name = config.name;
    this.fireMode = config.fireMode;       // 'semi' | 'auto'
    this.fireRate = config.fireRate;       // rounds per second
    this.damage = config.damage;
    this.recoilKick = config.recoilKick;   // radians added to camera per shot
    this.spread = config.spread;           // radians of random cone spread
    this.magazineSize = config.magazineSize;
    this.currentAmmo = config.magazineSize;
    this.reserveAmmo = config.reserveAmmo;
    this.reloadTime = config.reloadTime;   // seconds

    this.fireCooldown = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  /**
   * Attempt to fire one round.
   * @returns {boolean} true if a shot was fired
   */
  tryFire() {
    if (this.isReloading || this.currentAmmo <= 0) return false;
    if (this.fireCooldown > 0) return false;

    this.currentAmmo--;
    this.fireCooldown = 1 / this.fireRate;
    return true;
  }

  /** Begin reload if reserve ammo available */
  startReload() {
    if (this.isReloading) return false;
    if (this.currentAmmo >= this.magazineSize) return false;
    if (this.reserveAmmo <= 0) return false;

    this.isReloading = true;
    this.reloadTimer = this.reloadTime;
    return true;
  }

  /**
   * Tick cooldowns and reload timer
   * @param {number} delta - Frame delta in seconds
   */
  update(delta) {
    if (this.fireCooldown > 0) {
      this.fireCooldown -= delta;
    }

    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this._finishReload();
      }
    }
  }

  /** Transfer ammo from reserve to magazine */
  _finishReload() {
    const needed = this.magazineSize - this.currentAmmo;
    const transferred = Math.min(needed, this.reserveAmmo);
    this.currentAmmo += transferred;
    this.reserveAmmo -= transferred;
    this.isReloading = false;
  }

  /**
   * Compute a raycast direction with weapon spread applied
   * @param {THREE.PerspectiveCamera} camera
   * @returns {THREE.Vector3} Normalized direction
   */
  getSpreadDirection(camera) {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    if (this.spread > 0) {
      // Random offset within a cone
      const spreadX = (Math.random() - 0.5) * 2 * this.spread;
      const spreadY = (Math.random() - 0.5) * 2 * this.spread;

      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      right.crossVectors(direction, camera.up).normalize();
      up.crossVectors(right, direction).normalize();

      direction.addScaledVector(right, spreadX);
      direction.addScaledVector(up, spreadY);
      direction.normalize();
    }

    return direction;
  }
}
