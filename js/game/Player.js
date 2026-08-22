/**
 * Player.js â€” First-Person Controller
 *
 * Features:
 *  - WASD movement with sprint (Shift)
 *  - Mouse look via Pointer Lock API
 *  - Camera bobbing while walking
 *  - AABB boundary collision (clamped to firing lane)
 *  - Recoil kick applied to camera pitch on fire
 */

import * as THREE from 'three';

/** Movement speed constants (units/sec) */
const WALK_SPEED = 4.0;
const SPRINT_SPEED = 7.0;

/** Mouse sensitivity (radians per pixel) */
const MOUSE_SENSITIVITY = 0.002;

/** Camera bobbing parameters */
const BOB_FREQUENCY = 10;  // Hz
const BOB_AMPLITUDE = 0.035; // meters

export class Player {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLCanvasElement} canvas
   */
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;

    this.position = new THREE.Vector3(0, 1.7, 2);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;    // Horizontal rotation
    this.pitch = 0;  // Vertical rotation

    this.bounds = null;

    // Input state
    this.keys = {};
    this.isShooting = false;
    this.isADS = false;    // Right Mouse Button â€” Aim Down Sights

    // Bobbing state
    this.bobTimer = 0;
    this.baseEyeHeight = 1.7;

    // Recoil recovery
    this.recoilPitch = 0;
    this.recoilRecoverySpeed = 4.0;

    // Event callbacks (set by Game.js)
    this.onShoot = null;
    this.onReload = null;
    this.onWeaponSwitch = null;

    this._bindInput();
  }

  /** Set collision bounds from Environment */
  setBounds(bounds) {
    this.bounds = bounds;
  }

  /**
   * Apply upward camera kick from weapon recoil
   * @param {number} kick - Radians to add to pitch
   */
  applyRecoil(kick) {
    this.recoilPitch += kick;
  }

  /** Per-frame update */
  update(delta) {
    this._handleMovement(delta);
    this._handleBobbing(delta);
    this._recoverRecoil(delta);
    this._applyCameraTransform();
  }

  // â”€â”€ Input binding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  _bindInput() {
    // Keyboard
    this._onKeyDown = (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyR') this.onReload?.();
      if (e.code === 'Digit1') this.onWeaponSwitch?.(0);
      if (e.code === 'Digit2') this.onWeaponSwitch?.(1);
      if (e.code === 'Digit3') this.onWeaponSwitch?.(2);
      if (e.code === 'Digit4') this.onWeaponSwitch?.(3);
    };

    this._onKeyUp = (e) => {
      this.keys[e.code] = false;
    };
    // Mouse movement (only active during pointer lock)
    this._onMouseMove = (e) => {
      if (document.pointerLockElement !== this.canvas) return;

      // Adjust sensitivity if aiming down sights
      const sensitivity = this.isADS ? MOUSE_SENSITIVITY * 0.5 : MOUSE_SENSITIVITY;

      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;

      // Clamp pitch to avoid flipping
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    };

    // Mouse buttons
    this._onMouseDown = (e) => {
      const inGame = document.pointerLockElement === this.canvas
        || e.target === this.canvas;
      if (!inGame) return;
      if (e.button === 0) {
        this.isShooting = true;
        this.onShoot?.(true);
      }
      if (e.button === 2) {
        this.isADS = true;
      }
    };

    this._onMouseUp = (e) => {
      if (e.button === 0) {
        this.isShooting = false;
        this.onShoot?.(false);
      }
      if (e.button === 2) {
        this.isADS = false;
      }
    };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
    this.keys = {};
    this.isShooting = false;
    this.isADS = false;
  }

  // â”€â”€ Movement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _handleMovement(delta) {
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    );
    const right = new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    );

    const moveDir = new THREE.Vector3();

    if (this.keys['KeyW']) moveDir.add(forward);
    if (this.keys['KeyS']) moveDir.sub(forward);
    if (this.keys['KeyA']) moveDir.sub(right);
    if (this.keys['KeyD']) moveDir.add(right);

    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) {
      moveDir.normalize();
      
      let speed = WALK_SPEED;
      if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
        speed = SPRINT_SPEED;
      }
      if (this.isADS) {
        speed = WALK_SPEED * 0.4; // Slower while aiming
      }
      
      this.velocity.copy(moveDir.multiplyScalar(speed));
      this.bobTimer += delta * BOB_FREQUENCY * (this.isADS ? 0.5 : 1.0);
    } else {
      this.velocity.set(0, 0, 0);
      // Decay bob timer smoothly when stopping
      this.bobTimer *= 0.85;
    }

    // Integrate position
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;

    // Clamp to firing lane bounds
    if (this.bounds) {
      this.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, this.position.x));
      this.position.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, this.position.z));
    }
  }

  // â”€â”€ Camera bobbing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _handleBobbing(_delta) {
    const bobOffset = Math.sin(this.bobTimer) * BOB_AMPLITUDE * Math.min(this.bobTimer, 1);
    this.position.y = this.baseEyeHeight + bobOffset;
  }

  // â”€â”€ Recoil recovery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _recoverRecoil(delta) {
    if (this.recoilPitch > 0) {
      this.recoilPitch = Math.max(0, this.recoilPitch - this.recoilRecoverySpeed * delta);
    }
  }

  // â”€â”€ Apply final camera transform â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  _applyCameraTransform() {
    this.camera.position.copy(this.position);

    // Combine player pitch with recoil kick
    const totalPitch = this.pitch - this.recoilPitch;

    // Build rotation: yaw on Y, pitch on X
    const euler = new THREE.Euler(totalPitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }
}
