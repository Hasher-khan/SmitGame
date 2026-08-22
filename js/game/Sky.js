/**
 * Sky.js — Procedural outdoor sky dome with sun
 */

import * as THREE from 'three';

export function createSky(scene) {
  const skyGeo = new THREE.SphereGeometry(180, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0x89cff0) },
      offset: { value: 8 },
      exponent: { value: 0.55 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
  });

  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Distant sun glow billboard
  const sunGeo = new THREE.SphereGeometry(4, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff4e0 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(60, 45, -80);
  scene.add(sun);

  return sky;
}
