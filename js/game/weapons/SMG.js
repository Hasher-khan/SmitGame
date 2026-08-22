/**
 * SMG.js — Submachine Gun (MP5-style)
 *
 * Automatic fire, high fire rate, significant spread at long range.
 */

import { Weapon } from './Weapon.js';

export class SMG extends Weapon {
  constructor() {
    super({
      name: 'MP5 SMG',
      fireMode: 'auto',
      fireRate: 15,          // ~900 RPM
      damage: 15,
      recoilKick: 0.010,
      spread: 0.025,         // High spread — inaccurate at distance
      magazineSize: 30,
      reserveAmmo: 90,
      reloadTime: 1.8,
    });
  }
}
