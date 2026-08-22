/**
 * Pistol.js — Semi-Automatic Sidearm
 *
 * Single-shot per trigger pull, low recoil, fast handling.
 */

import { Weapon } from './Weapon.js';

export class Pistol extends Weapon {
  constructor() {
    super({
      name: 'M9 Pistol',
      fireMode: 'semi',
      fireRate: 4,           // ~240 RPM max tap-fire
      damage: 20,
      recoilKick: 0.006,
      spread: 0.004,
      magazineSize: 15,
      reserveAmmo: 45,
      reloadTime: 1.4,
    });
  }
}
