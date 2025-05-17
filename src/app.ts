import './style.css'
import './app-context'
// import typescriptLogo from './typescript.svg'
// import viteLogo from '/vite.svg'
// import { setupCounter } from './counter.ts'

// document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
//   <div>
//     <a href="https://vite.dev" target="_blank">
//       <img src="${viteLogo}" class="logo" alt="Vite logo" />
//     </a>
//     <a href="https://www.typescriptlang.org/" target="_blank">
//       <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
//     </a>
//     <h1>Vite + TypeScript</h1>
//     <div class="card">
//       <button id="counter" type="button"></button>
//     </div>
//     <p class="read-the-docs">
//       Click on the Vite and TypeScript logos to learn more
//     </p>
//   </div>
// `

// setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

import { Clock } from 'three'
import { PhysicsEngine } from './setup/physics-setup'
import { AppContext, AppState } from './app-context'
import { demo_main_setup } from './setup/app-setup'
import { Minimap } from './minimap/minimap'
import { asVect2 } from '@aresrpg/aresrpg-world'

/**
 * Initial setup
 */

demo_main_setup().then(init => {
    const {
        renderer,
        camera,
        scene,
        follow_player,
        cameraControls,
        terrain_viewer,
        heightmap_atlas,
        clutter_viewer,
        updateThreeStats,
        refreshUIPanel,
        on_chunks_polling,
    } = init

    AppContext.install(window)

    setInterval(on_chunks_polling, 1000)

    /**
     * LOD live updating
     */

    // setInterval(() => {
    //   terrain_viewer.setLod(camera.position, 100, 3000);
    // }, 200);

    /**
     * Tests
     */
    // initTests(worldMainProvider)

    /**
     * Frame refresh loop
     */
    const MAX_FRAME_COUNT = 10000
    const UI_REFRESH_RATE = 10
    const MINIMAP_REFRESH_RATE = 10
    const clock = new Clock()
    let frameCount = 0
    const on_frame_update_loop = () => {
        frameCount = (frameCount + 1) % MAX_FRAME_COUNT
        requestAnimationFrame(on_frame_update_loop)
        const delta = Math.min(clock.getDelta(), 0.5)
        const player_pos = AppState.playerPos
        terrain_viewer.update(renderer)
        heightmap_atlas.update(renderer)
        clutter_viewer.update(camera, player_pos)
        PhysicsEngine.instance().update()
        // cube.rotation.x += 0.01;
        // cube.rotation.y += 0.01;
        AppState.camTracking && follow_player(player_pos)
        updateThreeStats(frameCount)
        frameCount % UI_REFRESH_RATE === 0 && refreshUIPanel()
        frameCount % MINIMAP_REFRESH_RATE === 0 && Minimap.currentMap.refresh(asVect2(player_pos))
        cameraControls.update(delta)
        renderer.render(scene, camera)
    }

    on_frame_update_loop()
})

// set_water_level(50)
