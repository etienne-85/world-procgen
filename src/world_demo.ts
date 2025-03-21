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

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { init_chunks_polling_service, init_voxel_engine, setupLighting } from './demo_setup';
import { BlockMode, BlockType, parseChunkKey, parseThreeStub } from '@aresrpg/aresrpg-world';
import { voxelEncoder } from '@aresrpg/aresrpg-engine'
import { Vector3 } from 'three';
import { world_dev_tools } from './dev_tools';

const init_scene = () => {
  const container = document.querySelector<HTMLDivElement>('#app')
  const renderer = new THREE.WebGLRenderer();
  container!.appendChild(renderer.domElement);
  renderer.setClearColor(0xffffff);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
  const udpateRendererSize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', udpateRendererSize);
  udpateRendererSize();

  camera.position.set(0, 210, 10);
  const cameraControl = new OrbitControls(camera, renderer.domElement);
  cameraControl.target.set(0, camera.position.y - 10, 0);

  const scene = new THREE.Scene();
  scene.name = 'test-scene';
  // scene.matrixAutoUpdate = false;
  // scene.add(new THREE.AxesHelper(500));
  return { scene, camera, renderer }

}


function animate() {
  requestAnimationFrame(animate);
  terrain_viewer.update(renderer)
  heightmap_atlas.update(renderer)
  // cube.rotation.x += 0.01;
  // cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}

export const chunk_data_encoder = (value: BlockType, mode = BlockMode.REGULAR) => {
  if (value)
    return voxelEncoder.solidVoxel.encode(
      mode === BlockMode.CHECKERBOARD,
      value,
    )
  return voxelEncoder.encodeEmpty()
}

export const format_chunk_data = (chunk_data, skip_encoding = false) => {
  const { metadata, rawdata } = chunk_data

  const id = parseChunkKey(metadata.chunkKey)
  const bounds = parseThreeStub(metadata.bounds)
  const extended_bounds = bounds.clone().expandByScalar(metadata.margin)
  const size = extended_bounds.getSize(new Vector3())
  const data = metadata.isEmpty ? [] :
    skip_encoding ? rawdata : rawdata.map(chunk_data_encoder)
  const voxels_chunk_data = {
    data,
    size,
    dataOrdering: 'zxy',
    isEmpty: metadata.isEmpty,
  }
  const engine_chunk = {
    id,
    voxels_chunk_data,
  }
  return engine_chunk
}

// function render_world_chunk(
//   world_chunk,
//   { ignore_collision = false } = {},
// ) {
//   const { id, voxels_chunk_data } = to_engine_chunk_format(world_chunk)

//   voxelmap_viewer.invalidateChunk(id)
//   // @ts-ignore
//   voxelmap_viewer.enqueueChunk(id, voxels_chunk_data)

//   if (!ignore_collision)
//     // @ts-ignore
//     physics.voxelmap_collider.setChunk(id, voxels_chunk_data)
// }

const render_world_chunk = (chunk_data,
  {
    ignore_collision = true,
    skip_formatting = false,
    skip_encoding = false,
  } = {},
) => {
  const engine_chunk = skip_formatting
    ? chunk_data
    : format_chunk_data(chunk_data, skip_encoding)

  voxelmap_viewer.invalidateChunk(engine_chunk.id)
  // @ts-ignore
  voxelmap_viewer.enqueueChunk(engine_chunk.id, engine_chunk.voxels_chunk_data)
  // terrain_viewer.update(renderer)
  // if (!ignore_collision)
  //   // @ts-ignore
  //   physics.voxelmap_collider.setChunk(id, voxels_chunk_data)
}


const { voxelmap_viewer, terrain_viewer, heightmap_atlas, set_water_level } = init_voxel_engine()
world_dev_tools.api.render_board_chunks = board_chunks => {
  for (const chunk of board_chunks) {
    render_world_chunk(chunk.toStub(), { skip_formatting: false, skip_encoding: true })
  }
}
const on_remote_chunk_ready = chunk =>
  render_world_chunk(chunk, { skip_formatting: false })
const { poll_chunks, get_visible_chunk_ids } = init_chunks_polling_service(on_remote_chunk_ready)
const current_pos = new THREE.Vector2(0, 0)
const view_dist = 200
set_water_level(50)
setTimeout(() => {
  const scheduled_tasks = poll_chunks(current_pos, view_dist)
  if (scheduled_tasks) {
    voxelmap_viewer.setVisibility(get_visible_chunk_ids())
    scheduled_tasks.forEach(chunks_task =>
      chunks_task.then(chunks => {
        chunks?.forEach(chunk => {
          terrain_viewer.setLod(camera.position, 50, camera.far)
          heightmap_atlas.update(renderer)
          render_world_chunk(chunk, {
            skip_formatting: false,
            skip_encoding: false,
          })
        }
        )
      }),
    )
  }
}, 2000)

const { scene, camera, renderer } = init_scene()
setupLighting(renderer, scene)
scene.add(terrain_viewer.container)
terrain_viewer.setLod(camera.position, 50, camera.far)
terrain_viewer.parameters.lod.enabled = true
terrain_viewer.update(renderer)
voxelmap_viewer.setAdaptativeQuality({
  distanceThreshold: 75,
  cameraPosition: camera.getWorldPosition(new Vector3()),
})
animate();
// initWorld()
setInterval(() => {
  terrain_viewer.setLod(camera.position, 100, 3000);
}, 200);

const show_board = async () => {
  const {board_chunks} = await window.world_dev_tools.api.create_board(window.world_dev_tools.state.pos);
  window.world_dev_tools.api.render_board_chunks(board_chunks)
  console.log(board_chunks)
}