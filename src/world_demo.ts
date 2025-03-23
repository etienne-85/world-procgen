import './style.css'
import './dev_tools'
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

import { init_world_dev_tools } from './dev_tools';
import { Clock, Vector2 } from 'three';
import { demo_main_setup } from './demo_setup';
import { init_board_chunks_provider, init_chunks_polling_service } from './modules/procedural';
import { PhysicsEngine } from './modules/physics';
import { VIEW_DIST } from './demo_settings';

/**
 * Global setup
 */

const {
  world_demo_env,
  renderer, camera, scene, follow_player,
  terrain_viewer, heightmap_atlas, voxelmap_viewer,
  on_local_chunk_render, on_board_chunk_render, on_remote_chunk_render,
  chunk_data_encoder
} = demo_main_setup()

/**
 * Chunks polling
 */

const { poll_chunks, get_visible_chunk_ids } = init_chunks_polling_service(world_demo_env, on_remote_chunk_render)
const board_chunks_provider = init_board_chunks_provider(world_demo_env, chunk_data_encoder)

/**
 * Physics
 */

PhysicsEngine.instance(scene, camera)

/**
 * Dev tools
 */

const world_dev_tools = init_world_dev_tools(window);
world_dev_tools.api.board_chunks_provider = board_chunks_provider
world_dev_tools.api.board_chunks_render = board_chunks => {
  for (const chunk of board_chunks) {
    on_board_chunk_render(chunk)
  }
}

const clock = new Clock()

function main_loop() {
  requestAnimationFrame(main_loop);
  terrain_viewer.update(renderer)
  heightmap_atlas.update(renderer)
  PhysicsEngine.instance().update()
  // cube.rotation.x += 0.01;
  // cube.rotation.y += 0.01;
  const delta = Math.min(clock.getDelta(), 0.5)
  follow_player(PhysicsEngine.instance().player.container.position, delta)
  renderer.render(scene, camera);
}

main_loop();


// setInterval(() => {
//   terrain_viewer.setLod(camera.position, 100, 3000);
// }, 200);


// set_water_level(50)
setInterval(() => {
  const current_pos = PhysicsEngine.instance().player.container.position
  const scheduled_tasks = poll_chunks(current_pos, VIEW_DIST)
  if (scheduled_tasks) {
    voxelmap_viewer.setVisibility(get_visible_chunk_ids())
    scheduled_tasks.forEach(chunks_task =>
      chunks_task.then(chunks => {
        chunks?.forEach(local_chunk => {
          terrain_viewer.setLod(camera.position, 50, camera.far)
          heightmap_atlas.update(renderer)
          on_local_chunk_render(local_chunk)
        }
        )
      }),
    )
  }
}, 1000)

