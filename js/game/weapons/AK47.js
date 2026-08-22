/**
 * AK47.js — Assault Rifle
 *
 * Automatic fire, medium-high vertical recoil, medium fire rate (~600 RPM).
 */

import { Weapon } from './Weapon.js';

export class AK47 extends Weapon {
  constructor() {
    super({
      name: 'AK-47',
      fireMode: 'auto',
      fireRate: 10,          // 600 RPM
      damage: 30,
      recoilKick: 0.018,     // Noticeable vertical kick
      spread: 0.008,
      magazineSize: 30,
      reserveAmmo: 90,
      reloadTime: 2.2,
    });
  }
}
