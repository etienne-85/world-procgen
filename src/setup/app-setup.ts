import { BlockMode, BlockType, getChunkId, parseChunkKey, parseThreeStub, WorldGlobals } from '@aresrpg/aresrpg-world';
import { BLOCKS_COLOR_MAPPING, ExtBlock } from '../../../aresrpg-world/test/configs/blocks_mappings';
import { getWorldDemoEnv } from '../../../aresrpg-world/test/configs/world_demo_setup';
import { SCHEMATICS_FILES_INDEX } from '../assets/schematics_index';
import { init_voxel_engine } from './engine-setup';
import { init_graphics } from './graphics-setup';
import { Vector3 } from 'three';
import { voxelEncoder } from '@aresrpg/aresrpg-engine';
import { get_board_provider, getAsyncMapDataProvider, getMapDataProvider, init_lod_blocks_provider, initGlobalPurposeWorkerpool, initWorldMainProvider } from './world-setup';
import { PhysicsEngine } from './physics-setup';
import { init_controls } from '../modules/controls';
import { AppApi, AppContext, AppState, initThreeStats } from '../app-context';
import { Minimap } from '../modules/minimap';
import { MAP_POI } from '../config/app-user-settings';

const setupPOI = () => {
    const gotoPOI: Record<string, any> = {}

    for (const [label, coords] of Object.entries(MAP_POI)) {
        gotoPOI[label] = () => AppState.playerPos.set(coords.x, coords.y, coords.z)
    }
    return gotoPOI
}

/**
 * World settings customization
 */

const setupProceduralEnv = () => {
    const worldEnv = getWorldDemoEnv()
    // worldEnv.itemsEnv.schematics.filesIndex = SCHEMATICS_FILES_INDEX
    worldEnv.rawSettings.items.schematics.filesIndex = SCHEMATICS_FILES_INDEX
    // world_demo_env.rawSettings.biomes.repartition.centralHalfSegment = 0.07
    const worldGlobals = new WorldGlobals()
    worldGlobals.debug.logs = false
    // worldGlobals.debug.patch.borderHighlightColor = ExtBlock.DBG_LIGHT
    worldGlobals.debug.schematics.missingBlockType = BlockType.HOLE
    worldEnv.rawSettings.globals = worldGlobals.export()
    // worldEnv.rawSettings.distribution.mapPatchRange = 1
    // worldEnv.rawSettings.distributionMapPeriod = 1
    return worldEnv
}

const get_voxel_utils = () => {
    const blocks_color_mapping = Object.values(BLOCKS_COLOR_MAPPING)
    const chunk_data_encoder = (value: BlockType, mode = BlockMode.REGULAR) => {
        if (value)
            return mode === BlockMode.CHECKERBOARD ? voxelEncoder.clutterVoxel.encode(0, 1) :
                voxelEncoder.solidVoxel.encode(
                    mode === BlockMode.CHECKERBOARD,
                    value,
                )
        return voxelEncoder.encodeEmpty()
    }
    // console.log(blocks_color_mapping)
    return { blocks_color_mapping, chunk_data_encoder }
}

/**
 * Chunks
 */
const setup_chunks_rendering = (voxelmap_viewer: any, chunk_data_encoder: any) => {

    const chunk_data_formatter = (chunk_data, skip_encoding = true) => {
        const { metadata, rawdata } = chunk_data

        const id = parseChunkKey(metadata.chunkKey)
        const bounds = parseThreeStub(metadata.bounds)
        const extended_bounds = bounds.clone().expandByScalar(metadata.margin)
        const size = extended_bounds.getSize(new Vector3())
        const data = rawdata ? skip_encoding ? rawdata : rawdata.map(chunk_data_encoder) :
            []

        const voxels_chunk_data = {
            data,
            size,
            dataOrdering: 'zxy',
            isEmpty: !rawdata,
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
            skip_encoding = true,
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

const initUIPanel = () => {
    const playerPosElement = AppContext.gui.addBinding(AppState, 'playerPos', {
        label: "block",
        x: { readonly: false, format: (value) => Math.round(value) },
        y: { readonly: false, format: (value) => Math.round(value) },
        z: { readonly: false, format: (value) => Math.round(value) },
    });

    const patchCoordsElement = AppContext.gui.addBinding(AppState, 'patchCoords', {
        label: "patch",
        x: { readonly: false, format: (value) => Math.round(value) },
        y: { readonly: false, format: (value) => Math.round(value) },
        z: { readonly: false, format: (value) => Math.round(value) },
    });


    const resetCamBtn = AppContext.gui.addButton({ title: `reset cam` });
    resetCamBtn.on('click', () => AppState.camTracking = true)
    // App.gui.addBinding(AppState, 'camTracking', {
    //     label: 'track',
    // })

    return { playerPosElement, patchCoordsElement }
}



export const demo_main_setup = async () => {
    // Procedural settings
    const world_demo_env = setupProceduralEnv()
    // Graphics
    const { scene, camera, renderer } = init_graphics()
    // Physics
    PhysicsEngine.instance(scene, camera)
    // Controls
    const { cameraControls, follow_player } = init_controls(camera, renderer)
    // Misc
    const { blocks_color_mapping, chunk_data_encoder } = get_voxel_utils()
    // LOD
    const { lod_blocks_provider, cancelAllLodTasks } = init_lod_blocks_provider(world_demo_env)
    // Voxels
    const { voxelmap_viewer, terrain_viewer, heightmap_atlas, clutter_viewer, set_water_level } = init_voxel_engine(blocks_color_mapping, lod_blocks_provider)
    terrain_viewer.setLod(camera.position, 50, camera.far)
    // terrain_viewer.parameters.lod.enabled = true
    terrain_viewer.update(renderer)
    voxelmap_viewer.setAdaptativeQuality({
        distanceThreshold: 75,
        cameraPosition: camera.getWorldPosition(new Vector3()),
    })
    scene.add(terrain_viewer.container)
    // Chunks rendering
    const world_chunk_renderer = setup_chunks_rendering(voxelmap_viewer, chunk_data_encoder)
    const on_local_chunk_render = local_chunk => world_chunk_renderer(local_chunk, { skip_formatting: false, skip_encoding: true })
    const on_remote_chunk_render = remote_chunk => world_chunk_renderer(remote_chunk, { skip_formatting: false })
    const on_board_chunk_render = board_chunk => world_chunk_renderer(board_chunk, { skip_formatting: false, skip_encoding: true })
    // State
    const playerPos = PhysicsEngine.instance().player.container.position
    const patchCoords = playerPos.clone()
    AppContext.state.add({ playerPos, patchCoords })
    const camTracking = true
    AppContext.state.add({ camTracking })
    const updatePatchCoords = () => {
        const { playerPos, patchCoords } = AppState
        const chunkId = getChunkId(playerPos, world_demo_env.getChunkDimensions())
        patchCoords.set(chunkId.x, chunkId.y, chunkId.z)
    }
    updatePatchCoords()
    const gotoPOI = setupPOI()
    AppContext.api.add({ gotoPOI })
    // UI
    const { playerPosElement, patchCoordsElement } = initUIPanel()
    const refreshUIPanel = () => {
        playerPosElement.refresh()
        updatePatchCoords()
        patchCoordsElement.refresh()
    }

    // const refreshPlayerPosUI = playerPosElement.refresh

    const resetLod = () => {
        // const lodState = terrain_viewer.parameters.lod
        // lodState.enabled = !lodState.enabled
        // console.log(`toggling LOD ${lodState.enabled}`)
        cancelAllLodTasks()
        terrain_viewer.setLod(camera.position, 50, camera.far)
    }
    AppContext.api.add({ resetLod })
    // Board
    const boardBrovider = get_board_provider(world_demo_env, chunk_data_encoder, playerPos)
    const toggleBoard = () => boardBrovider().then(board => {
        const { boardData, boardChunks, originalChunks } = board
        console.log(boardData)
        const renderBoardChunks = (chunks) => {
            for (const chunk of chunks) {
                on_board_chunk_render(chunk.toStub())
            }
        }
        renderBoardChunks(boardChunks)
        const removeLast = () => {
            renderBoardChunks(originalChunks)
            // App.instance.api.toggleBoard = toggleBoard
            return true
        }
        AppApi.toggleBoard = () => removeLast() && toggleBoard()
    })

    const boardBtn = AppContext.gui.addButton({ title: `show board` });
    boardBtn.on('click', () => AppApi.toggleBoard())

    AppContext.api.add({ resetLod, toggleBoard })

    // World providers
    const worldMainProvider = await initWorldMainProvider(world_demo_env)
    const globalPurposeWorkerpool = await initGlobalPurposeWorkerpool(world_demo_env)

    // Minimap
    const minimapContainer = document.querySelector<HTMLCanvasElement>('#minimap') as HTMLCanvasElement
    const mapDataProvider = getAsyncMapDataProvider(globalPurposeWorkerpool) //getMapDataProvider(worldMainProvider.taskHandlers)
    const minimap = new Minimap(minimapContainer, mapDataProvider, worldMainProvider)

    // Three stats
    const { updateThreeStats } = initThreeStats(renderer)

    return {
        world_demo_env,
        renderer,
        scene,
        camera,
        terrain_viewer,
        clutter_viewer,
        heightmap_atlas,
        voxelmap_viewer,
        chunk_data_encoder,
        on_local_chunk_render,
        on_remote_chunk_render,
        on_board_chunk_render,
        cameraControls,
        follow_player,
        updateThreeStats,
        refreshUIPanel,
        worldMainProvider,
        minimap
    }
}











