/**
 * MachineGun.js — Heavy Machine Gun (LMG)
 *
 * Rapid automatic fire rate, 100-round drum magazine, heavy suppression weapon.
 */

import { Weapon } from './Weapon.js';

export class MachineGun extends Weapon {
  constructor() {
    super({
      name: 'MACHINE GUN',
      fireMode: 'auto',
      fireRate: 14,          // 840 RPM rapid fire
      damage: 35,
      recoilKick: 0.012,     // Controlled heavy continuous fire
      spread: 0.010,
      magazineSize: 100,     // 100 bullets per magazine
      reserveAmmo: 300,
      reloadTime: 3.2,
    });
  }
}
