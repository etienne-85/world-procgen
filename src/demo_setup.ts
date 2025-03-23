import { BlockMode, BlockType, parseChunkKey, parseThreeStub } from '@aresrpg/aresrpg-world';
// import workerUrl from '@aresrpg/aresrpg-world/worker?url'

import { BLOCKS_COLOR_MAPPING } from '../../aresrpg-world/test/configs/blocks_mappings';
import { getWorldDemoEnv } from '../../aresrpg-world/test/configs/world_demo_setup';
import { SCHEMATICS_FILES_INDEX } from './assets/schematics_index';
import { init_voxel_engine } from './modules/voxels';
import { init_graphics } from './modules/graphics';
import { Vector3 } from 'three';
import { voxelEncoder } from '@aresrpg/aresrpg-engine';
import { init_board_chunks_provider, init_lod_blocks_provider } from './modules/procedural';
import { PhysicsEngine } from './modules/physics';
import { init_controls } from './modules/controls';

/**
 * World settings customization
 */

const setup_world_env = () => {
    const world_demo_env = getWorldDemoEnv()
    world_demo_env.rawSettings.items.schematics.filesIndex = SCHEMATICS_FILES_INDEX
    return world_demo_env
}

const get_voxel_utils = () => {
    const blocks_color_mapping = Object.values(BLOCKS_COLOR_MAPPING)
    const chunk_data_encoder = (value: BlockType, mode = BlockMode.REGULAR) => {
        if (value)
            return voxelEncoder.solidVoxel.encode(
                mode === BlockMode.CHECKERBOARD,
                value,
            )
        return voxelEncoder.encodeEmpty()
    }
    console.log(blocks_color_mapping)
    return { blocks_color_mapping, chunk_data_encoder }
}

/**
 * Chunks
 */
const setup_chunks_rendering = (voxelmap_viewer: any, chunk_data_encoder: any) => {

    const chunk_data_formatter = (chunk_data, skip_encoding = false) => {
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

    const world_chunk_renderer = (chunk_data,
        {
            ignore_collision = true,
            skip_formatting = false,
            skip_encoding = false,
        } = {},
    ) => {
        const engine_chunk = skip_formatting
            ? chunk_data
            : chunk_data_formatter(chunk_data, skip_encoding)

        voxelmap_viewer.invalidateChunk(engine_chunk.id)
        // @ts-ignore
        voxelmap_viewer.enqueueChunk(engine_chunk.id, engine_chunk.voxels_chunk_data)
        // terrain_viewer.update(renderer)
        // if (!ignore_collision)
        //   // @ts-ignore
        //   physics.voxelmap_collider.setChunk(id, voxels_chunk_data)
        PhysicsEngine.instance().onChunk(engine_chunk.id, engine_chunk.voxels_chunk_data)
    }

    return world_chunk_renderer
}


export const demo_main_setup = () => {
    // Demo settings
    const world_demo_env = setup_world_env()
    // Graphics
    const { scene, camera, renderer } = init_graphics()
    // Controls
    const follow_player = init_controls(camera, renderer) 
    // Misc
    const { blocks_color_mapping, chunk_data_encoder } = get_voxel_utils()
    // LOD
    const lod_blocks_provider = init_lod_blocks_provider(world_demo_env)
    // Voxels
    const { voxelmap_viewer, terrain_viewer, heightmap_atlas, set_water_level } = init_voxel_engine(blocks_color_mapping, lod_blocks_provider)
    terrain_viewer.setLod(camera.position, 50, camera.far)
    terrain_viewer.parameters.lod.enabled = true
    terrain_viewer.update(renderer)
    voxelmap_viewer.setAdaptativeQuality({
        distanceThreshold: 75,
        cameraPosition: camera.getWorldPosition(new Vector3()),
    })
    scene.add(terrain_viewer.container)
    // Chunks rendering
    const world_chunk_renderer = setup_chunks_rendering(voxelmap_viewer, chunk_data_encoder)
    const on_local_chunk_render = local_chunk => world_chunk_renderer(local_chunk, { skip_formatting: false, skip_encoding: false })
    const on_remote_chunk_render = remote_chunk => world_chunk_renderer(remote_chunk, { skip_formatting: false })
    const on_board_chunk_render = board_chunk => world_chunk_renderer(board_chunk, { skip_formatting: false, skip_encoding: true })

    return {
        world_demo_env,
        renderer,
        scene,
        camera,
        terrain_viewer,
        heightmap_atlas,
        voxelmap_viewer,
        chunk_data_encoder,
        on_local_chunk_render,
        on_remote_chunk_render,
        on_board_chunk_render,
        follow_player
    }
}











