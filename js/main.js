/**
 * main.js — Landing Page ↔ WebGL Bridge
 *
 * Handles the DOM-to-canvas state transition and ensures the game
 * actually boots. Shows errors if opened without a dev server.
 */

import { Game } from './game/Game.js';

let game = null;

const landingEl = document.getElementById('landing');
const startBtn = document.getElementById('start-btn');
const gameContainer = document.getElementById('game-container');
const canvas = document.getElementById('game-canvas');
const loadingEl = document.getElementById('loading');

/** Warn if opened via file:// — ES modules won't load */
if (location.protocol === 'file:') {
  showError(
    'Cannot run from file://',
    'Open a terminal in the project folder and run: npm run dev — then visit http://localhost:3000'
  );
  startBtn.disabled = true;
}

/**
 * Transition from landing page to the live 3D simulation.
 */
async function startSimulation() {
  startBtn.disabled = true;
  startBtn.textContent = 'Loading...';

  // Show loading overlay immediately
  landingEl.classList.add('fade-out');
  gameContainer.classList.remove('hidden');
  loadingEl?.classList.remove('hidden');

  try {
    // Small delay lets the browser paint the canvas before WebGL init
    await new Promise((r) => setTimeout(r, 100));

    game = new Game(canvas);
    game.init();
    game.start();

    // Hide landing + loading once the first frame renders
    requestAnimationFrame(() => {
      landingEl.classList.add('hidden');
      loadingEl?.classList.add('hidden');
      startBtn.textContent = 'Start Simulation';
      startBtn.disabled = false;
    });

    // Request pointer lock immediately (user gesture from button click)
    try {
      await canvas.requestPointerLock();
    } catch {
      // Browser may defer — user can click canvas
    }

  } catch (err) {
    console.error('Game failed to start:', err);
    showError('Failed to start simulation', err.message);
    landingEl.classList.remove('fade-out', 'hidden');
    gameContainer.classList.add('hidden');
    loadingEl?.classList.add('hidden');
    startBtn.textContent = 'Start Simulation';
    startBtn.disabled = false;
  }
}

function requestPointerLock() {
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
}

function showError(title, message) {
  let el = document.getElementById('error-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'error-overlay';
    el.className = 'error-overlay';
    document.body.appendChild(el);
  }
  el.innerHTML = `<h2>${title}</h2><p>${message}</p>`;
  el.classList.remove('hidden');
}

const pauseMenu = document.getElementById('pause-menu');
const btnResume = document.getElementById('btn-resume');
const btnExit = document.getElementById('btn-exit');

startBtn.addEventListener('click', startSimulation);

document.addEventListener('pointerlockchange', () => {
  const isLocked = document.pointerLockElement === canvas;
  
  const prompt = document.getElementById('hud-prompt');
  if (prompt) {
    prompt.classList.toggle('hidden', isLocked);
  }

  if (game && game.isRunning) {
    if (isLocked) {
      pauseMenu.classList.add('hidden');
    } else {
      pauseMenu.classList.remove('hidden');
    }
  }
});

btnResume.addEventListener('click', () => {
  requestPointerLock();
});

btnExit.addEventListener('click', () => {
  if (game) {
    game.dispose();
    game = null;
  }

  if (document.pointerLockElement === canvas) document.exitPointerLock();
  
  // Hide game container and pause menu
  gameContainer.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  
  // Show landing page
  landingEl.classList.remove('fade-out', 'hidden');
  startBtn.textContent = 'ENTER RANGE';
  startBtn.disabled = false;
  
  // Clean up if needed (could dispose Three.js resources here if necessary)
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('click', requestPointerLock);

// Resume audio context on any user interaction
document.addEventListener('click', () => {
  game?.audio?.resume?.();
}, { once: false });
