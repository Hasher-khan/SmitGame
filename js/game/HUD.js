/**
 * HUD.js — Professional Game HUD Manager
 *
 * Manages all DOM-based HUD elements:
 *  - Ammo counter with low-ammo warning
 *  - Weapon name + selector tabs
 *  - Hit marker flash
 *  - Crosshair bloom on fire
 *  - Reload bar
 *  - Score with pop animation
 *  - Kill / hit feed
 */

export class HUD {
  constructor() {
    this.ammoCurrentEl  = document.getElementById('hud-ammo-current');
    this.ammoReserveEl  = document.getElementById('hud-ammo-reserve');
    this.weaponNameEl   = document.getElementById('hud-weapon-name');
    this.scoreEl        = document.getElementById('hud-score');
    this.reloadEl       = document.getElementById('hud-reload');
    this.promptEl       = document.getElementById('hud-prompt');
    this.crosshairEl    = document.getElementById('hud-crosshair');
    this.hitmarkerEl    = document.getElementById('hud-hitmarker');
    this.feedEl         = document.getElementById('hud-feed');
    this.weaponTabs     = document.querySelectorAll('.hud__weapon-tab');
    this.onWeaponSelect = null;

    this._hitMarkerTimer = 0;
    this._bloomTimer     = 0;
    this._bloomRAF       = null;

    this._onWeaponTabClick = (event) => {
      const index = Number(event.currentTarget.dataset.index);
      if (Number.isInteger(index)) this.onWeaponSelect?.(index);
    };
    this.weaponTabs.forEach((tab) => tab.addEventListener('click', this._onWeaponTabClick));
  }

  updateAmmo(current, reserve) {
    if (!this.ammoCurrentEl) return;
    this.ammoCurrentEl.textContent = current;
    if (this.ammoReserveEl) this.ammoReserveEl.textContent = reserve;

    // Low ammo warning
    const isLow = current <= 5 && current > 0;
    const isEmpty = current === 0;
    this.ammoCurrentEl.classList.toggle('hud__ammo-current--low',   isLow);
    this.ammoCurrentEl.classList.toggle('hud__ammo-current--empty', isEmpty);
  }

  updateWeapon(name, index) {
    if (this.weaponNameEl) this.weaponNameEl.textContent = name;

    // Update selector tabs
    this.weaponTabs.forEach((tab, i) => {
      tab.classList.toggle('hud__weapon-tab--active', i === index);
    });
  }

  updateScore(score) {
    if (!this.scoreEl) return;
    this.scoreEl.textContent = score;
    this.scoreEl.classList.remove('hud__score-pop');
    // Force reflow to restart animation
    void this.scoreEl.offsetWidth;
    this.scoreEl.classList.add('hud__score-pop');
  }

  showReload(visible) {
    if (!this.reloadEl) return;
    if (visible) {
      this.reloadEl.classList.remove('hidden');
    } else {
      this.reloadEl.classList.add('hidden');
    }
  }

  showHitMarker() {
    if (!this.hitmarkerEl) return;
    this.hitmarkerEl.classList.add('hud__hitmarker--active');
    clearTimeout(this._hitTimer);
    this._hitTimer = setTimeout(() => {
      this.hitmarkerEl.classList.remove('hud__hitmarker--active');
    }, 120);
  }

  bloomCrosshair() {
    if (!this.crosshairEl) return;
    this.crosshairEl.classList.add('hud__crosshair--bloom');
    clearTimeout(this._bloomTimer);
    this._bloomTimer = setTimeout(() => {
      this.crosshairEl.classList.remove('hud__crosshair--bloom');
    }, 180);
  }

  addFeedEntry(text) {
    if (!this.feedEl) return;
    const entry = document.createElement('div');
    entry.className = 'hud__feed-entry';
    entry.textContent = text;
    this.feedEl.prepend(entry);
    // Remove after 3 seconds
    setTimeout(() => {
      entry.classList.add('hud__feed-entry--fade');
      setTimeout(() => entry.remove(), 500);
    }, 2500);
    // Keep max 5 entries
    while (this.feedEl.children.length > 5) {
      this.feedEl.lastChild.remove();
    }
  }

  dispose() {
    clearTimeout(this._hitTimer);
    clearTimeout(this._bloomTimer);
    this.weaponTabs.forEach((tab) => tab.removeEventListener('click', this._onWeaponTabClick));
  }
}
