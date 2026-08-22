## Project Overview
*   **Identity**: The project is named `fpp-firing-range` and is designed as a browser-based 3D First-Person tactical firing range simulator[cite: 2].
*   **Gameplay**: Players train in a realistic live-fire environment featuring three target lines, infinite reserve ammunition, and three distinct weapons: an AK-47 Assault Rifle, a 9mm Pistol, and an MP5 Submachine Gun[cite: 1].

## Technical Specifications
*   **Core Engine**: The 3D environment and rendering are powered by the `three` library, specifically utilizing version `^0.160.0`[cite: 2, 3].
*   **Build Environment**: The project uses `vite` (version `^5.4.0`) as its development and build tool, exposing npm scripts to run the dev server (`dev`), compile the project (`build`), and preview the build (`preview`)[cite: 2, 3].
*   **Configuration**: The Vite configuration defines the development server to run on port 3000, uses `public` as the static directory, and outputs the final built files to a `dist` folder while generating sourcemaps[cite: 4].

## Game Interface & Controls
*   **Application States**: The HTML structure is divided into a landing page with a start button, an initialization loading screen, the main game canvas, and a pause menu featuring "RESUME" and "EXIT TO MENU" buttons[cite: 1].
*   **Heads-Up Display (HUD)**: The on-screen interface includes a 4-gap tactical crosshair, a distinct hit marker, a reloading indicator, a top-right kill feed, and bottom panels tracking the current score and ammunition[cite: 1].
*   **Movement Controls**: The user navigates the environment using standard `WASD` keys for movement and the `Shift` key to sprint[cite: 1].
*   **Combat Controls**: The simulation is controlled via the Mouse for aiming, `LMB` for firing, `RMB` to aim down sights, `R` to reload, and the `1`, `2`, and `3` keys to switch between the equipped weapons[cite: 1].

## Code Architecture
*   **Module System**: The package is explicitly defined as an ES module (`"type": "module"`)[cite: 2].
*   **Asset Loading**: The main `index.html` file acts as the entry point, pulling in its primary CSS from `/css/styles.css` and its core JavaScript logic from `/js/main.js`[cite: 1].
*   **Typography**: The interface styling relies on a preconnected Google Fonts stylesheet that imports the Rajdhani, Share Tech Mono, and Oswald font families[cite: 1].