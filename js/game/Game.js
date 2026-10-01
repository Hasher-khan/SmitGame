/**
 * Game.js — Core Three.js Game Loop (Professional Edition)
 */

import * as THREE from 'three';
import { Environment }     from './Environment.js';
import { Player }          from './Player.js';
import { HUD }             from './HUD.js';
import { WeaponViewModel } from './WeaponViewModel.js';
import { Effects }         from './Effects.js';
import { WeaponSystem }    from './weapons/WeaponSystem.js';
import { AudioManager }    from '../utils/AudioManager.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x87b8d4, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      72,
      window.innerWidth / window.innerHeight,
      0.05,
      250
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.clock     = new THREE.Clock();
    this.isRunning = false;
    this.score     = 0;

    // Screen shake state
    this._shakePitch = 0;
    this._shakeYaw   = 0;

    this._onResize = this._onResize.bind(this);
  }

  init() {
    this.audio = new AudioManager();

    this.environment = new Environment(this.scene);
    this.environment.build();

    this.player = new Player(this.camera, this.canvas);
    this.player.setBounds(this.environment.getBounds());

    this.weaponView = new WeaponViewModel(this.camera);
    this.effects    = new Effects(this.scene, this.camera, this.weaponView);

    this.weaponSystem = new WeaponSystem(
      this.camera,
      this.scene,
      this.audio,
      this.environment.getTargets(),
      this.weaponView,
      this.effects
    );

    this.hud = new HUD();

    // ── Weapon system callbacks ──────────────────────────────────
    this.weaponSystem.onHit = (target, hitPoint, normal, points) =>
      this._onTargetHit(target, hitPoint, normal, points);

    this.weaponSystem.onFire = () => {
      const w = this.weaponSystem.currentWeapon;
      this.player.applyRecoil(w.recoilKick);
      this.weaponView.applyRecoil(w.recoilKick * 45);
      this.effects.addTrauma(0.18 * w.recoilKick * 10);
      this.hud.bloomCrosshair();
    };

    this.weaponSystem.onAmmoChange = (c, r) => this.hud.updateAmmo(c, r);

    this.weaponSystem.onWeaponChange = (name, idx) => {
      this.hud.updateWeapon(name, idx);
      this.weaponView.showWeapon(idx);
    };

    this.weaponSystem.onReloadStart = () => {
      this.hud.showReload(true);
      this.weaponView.startReload();
    };

    this.weaponSystem.onReloadEnd = () => {
      this.hud.showReload(false);
      this.weaponView.endReload();
    };

    // Initial HUD state
    this.hud.updateWeapon(this.weaponSystem.currentWeapon.name, 0);
    this.hud.updateAmmo(
      this.weaponSystem.currentWeapon.currentAmmo,
      this.weaponSystem.currentWeapon.reserveAmmo
    );

    const bossBug = this.environment.getBossBug();
    if (bossBug) {
      this.hud.updateBossHealth(bossBug.health, bossBug.maxHealth);
    }

    // ── Player callbacks ─────────────────────────────────────────
    this.player.onShoot        = (d) => this.weaponSystem.handleFireInput(d);
    this.player.onReload       = ()  => this.weaponSystem.reload();
    this.player.onWeaponSwitch = (i) => this.weaponSystem.switchWeapon(i);
    this.hud.onWeaponSelect = (i) => this.weaponSystem.switchWeapon(i);

    // Spawn
    const spawn = this.environment.getSpawnPoint();
    this.player.position.copy(spawn);
    this.player.yaw = Math.PI;
    this.camera.position.copy(spawn);
  }

  resetGame() {
    this.isVictory = false;
    this.score = 0;
    this.hud.updateScore(0);
    this.hud.showVictory(false);

    // Reset player position
    const spawn = this.environment.getSpawnPoint();
    this.player.position.copy(spawn);
    this.player.yaw = Math.PI;
    this.player.pitch = 0;
    this.camera.position.copy(spawn);

    // Reset Code Bug
    const bossBug = this.environment.getBossBug();
    if (bossBug) {
      bossBug.reset();
      this.hud.updateBossHealth(bossBug.health, bossBug.maxHealth);
    }

    // Reset weapon system ammo
    if (this.weaponSystem) {
      this.weaponSystem.weapons.forEach((w) => {
        w.currentAmmo = w.maxAmmo;
        w.reserveAmmo = w.initialReserve;
      });
      const currW = this.weaponSystem.currentWeapon;
      this.hud.updateAmmo(currW.currentAmmo, currW.reserveAmmo);
    }
  }

  start() {
    this.isRunning = true;
    this._loop = this._loop.bind(this);
    window.addEventListener('resize', this._onResize);
    requestAnimationFrame(this._loop);
  }

  dispose() {
    this.isRunning = false;
    window.removeEventListener('resize', this._onResize);
    this.player?.dispose();
    this.hud?.dispose();
    this.renderer?.dispose();
  }

  _loop() {
    if (!this.isRunning) return;
    requestAnimationFrame(this._loop);

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.player.update(delta);
    this.weaponSystem.update(delta);
    this.environment.update(delta);
    this.effects.update(delta);

    // Weapon viewmodel
    const moving = this.player.velocity.lengthSq() > 0.1;
    this.weaponView.update(delta, moving, this.player.bobTimer, this.player.isADS);

    // Camera shake (trauma) — must run AFTER player.update sets camera quaternion
    const shakeRot = this.effects.getShakeOffset(delta);
    this.camera.quaternion.multiply(shakeRot);

    // ADS Zoom — smooth FOV transition
    const targetFOV = this.player.isADS ? 45 : 72;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, delta * 8);
    this.camera.updateProjectionMatrix();

    // Render world scene
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    // Render weapon viewmodel on top (separate depth pass)
    this.weaponView.render(this.renderer, this.camera);

    // HUD updates (every frame — cheap DOM reads)
    const w = this.weaponSystem.currentWeapon;
    this.hud.updateAmmo(w.currentAmmo, w.reserveAmmo);

    // Hide/show crosshair based on ADS state
    const crosshair = document.getElementById('hud-crosshair');
    if (crosshair) {
      crosshair.classList.toggle('hidden', this.player.isADS);
    }
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _onTargetHit(target, hitPoint, normal, points) {
    this.score += points || 10;
    this.hud.updateScore(this.score);
    this.hud.showHitMarker();

    // Feed message
    const msg = target.userData.feedMsg || `+${points} CODE BUG HIT!`;
    this.hud.addFeedEntry(`+${points}  ${msg}`);

    target.userData.onHit?.(hitPoint);
    if (hitPoint) this.effects.spawnImpact(hitPoint, normal);

    // Apply damage to Code Bug Boss
    const bossBug = this.environment.getBossBug();
    if (bossBug && !bossBug.isDead) {
      const damage = points || 25;
      const isKilled = bossBug.takeDamage(damage);
      this.hud.updateBossHealth(bossBug.health, bossBug.maxHealth);

      if (isKilled) {
        this.hud.addFeedEntry('🏆 CODE BUG KILLED!');
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        setTimeout(() => {
          this.hud.showVictory(true, this.score);
        }, 400);
      }
    }
  }
}
