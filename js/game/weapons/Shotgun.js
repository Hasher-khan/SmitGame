/**
 * Shotgun.js — Pump-Action Short Gun (12-gauge style)
 *
 * Semi-auto (one shot per trigger pull), very high spread (multi-pellet),
 * devastating up close, weak at distance. Slow fire rate, slow reload.
 */

import { Weapon } from './Weapon.js';

export class Shotgun extends Weapon {
  constructor() {
    super({
      name: 'Shotgun',
      fireMode: 'semi',
      fireRate: 1.4,         // ~84 RPM — pump-action pace
      damage: 80,            // High per-trigger (represents full spread)
      recoilKick: 0.048,     // Heavy kick
      spread: 0.095,         // Wide spread — poor at range
      magazineSize: 8,       // 8-shell tube
      reserveAmmo: 32,
      reloadTime: 3.2,       // Slow shell-by-shell reload
    });
  }
}
