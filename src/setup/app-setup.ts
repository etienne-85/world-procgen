import { asVect2, BlockType, DataChunkStub, parseChunkKey, parseThreeStub, WorldGlobals, WorldModules } from '@aresrpg/aresrpg-world';
import { BLOCKS_COLOR_MAPPING, ExtBlock } from '../../../aresrpg-world/test/configs/blocks_mappings';
import { getWorldDemoEnv } from '../../../aresrpg-world/test/configs/world_demo_setup';
import { SCHEMATICS_FILES_INDEX } from '../assets/schematics_index';
import { init_voxel_engine } from './engine-setup';
import { init_graphics } from './graphics-setup';
import { Vector3 } from 'three';
import { get_board_provider, init_lod_blocks_provider, initGlobalPurposeWorkerpool, initWorldMainProvider } from './world-setup';
import { PhysicsEngine } from './physics-setup';
import { init_controls } from '../modules/controls';
import { AppApi, AppContext, AppState, initThreeStats } from '../app-context';
import { MAP_POI } from '../config/user-settings.local';
import { initUIPanel } from './gui-setup';
import { Minimap } from '../minimap/minimap';
import { GroundRenderLayer, NoiseRenderLayer } from '../minimap/map-render-layer';

const populatePOIContext = () => {
    const gotoPOI: Record<string, any> = {}

    for (const [label, coords] of Object.entries(MAP_POI)) {
        gotoPOI[label] = () => AppState.playerPos.set(coords.x, coords.y, coords.z)
    }
    return gotoPOI
}

const populateAppContext = () => {
    // Context
    const playerPos = PhysicsEngine.instance().player.container.position
    const patchCoords = playerPos.clone()
    const lastPatchCoords = patchCoords.clone()
    AppContext.state.add({ playerPos, patchCoords, lastPatchCoords })
    const camTracking = true
    AppContext.state.add({ camTracking })
    const gotoPOI = populatePOIContext()
    AppContext.api.add({ gotoPOI })
}

/**
 * World settings customization
 */

const setupProceduralEnv = () => {
    const worldEnv = getWorldDemoEnv()
    // worldEnv.itemsEnv.schematics.filesIndex = SCHEMATICS_FILES_INDEX
    worldEnv.rawSettings.inventory.schematics.filesIndex = SCHEMATICS_FILES_INDEX
    // world_demo_env.rawSettings.biomes.repartition.centralHalfSegment = 0.07
    const worldGlobals = new WorldGlobals()
    // worldGlobals.debug.logs = true
    worldGlobals.debug.patch.borderHighlightColor = ExtBlock.DBG_LIGHT
    worldGlobals.debug.schematics.missingBlockType = BlockType.HOLE
    worldEnv.rawSettings.globals = worldGlobals.export()
    // worldEnv.rawSettings.distribution.mapPatchRange = 1
    // worldEnv.rawSettings.distributionMapPeriod = 1
    return worldEnv
}

/**
 * Chunks
 */
const setup_chunks_rendering = (voxelmap_viewer: any, disablePatchLod: any) => {

    const chunk_data_formatter = (chunk_data: DataChunkStub) => {
        const { metadata, rawdata } = chunk_data

        const id = parseChunkKey(metadata.chunkKey)
        const bounds = parseThreeStub(metadata.bounds)
        const extended_bounds = bounds.clone().expandByScalar(metadata.margin)
        const size = extended_bounds.getSize(new Vector3())
        const data = rawdata ? rawdata : []

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

    const world_chunk_renderer = (chunk_data: DataChunkStub,
        {
            ignore_collision = true,
            skip_formatting = false,
        } = {},
    ) => {
        const engine_chunk = skip_formatting
            ? chunk_data
            : chunk_data_formatter(chunk_data)

        voxelmap_viewer.invalidateChunk(engine_chunk.id)
        // @ts-ignore
        voxelmap_viewer.enqueueChunk(engine_chunk.id, engine_chunk.voxels_chunk_data)
        const patchId = asVect2(engine_chunk.id)
        disablePatchLod(patchId)
        // terrain_viewer.update(renderer)
        // if (!ignore_collision)
        //   // @ts-ignore
        //   physics.voxelmap_collider.setChunk(id, voxels_chunk_data)
        PhysicsEngine.instance().onChunk(engine_chunk.id, engine_chunk.voxels_chunk_data)
    }
    return world_chunk_renderer
}

const setupMinimap = (worldProvider: WorldModules) => {
    const { worldLocalEnv, spawn } = worldProvider
    const minimapContainer = document.querySelector<HTMLCanvasElement>('#minimap') as HTMLCanvasElement
    const patchDim = worldLocalEnv.getPatchDimensions()
    const noiseSource = spawn.spawnDistributionNoise //spawnDistributionMap.spawnDistributionLaw
    // noiseSource.params.scaling*=2
    const noiseRenderLayer = new NoiseRenderLayer(patchDim, noiseSource)
    const groundRenderLayer = new GroundRenderLayer(patchDim, worldProvider)
    const minimap = new Minimap(minimapContainer, [groundRenderLayer, noiseRenderLayer])
    return minimap
}

export const demo_main_setup = async () => {
    // Procedural settings
    const world_demo_env = setupProceduralEnv()
    // Graphics
    const { scene, camera, renderer } = init_graphics()
    // Controls
    const { cameraControls, follow_player } = init_controls(camera, renderer)
    // LOD
    const { lod_blocks_provider, cancelAllLodTasks } = init_lod_blocks_provider(world_demo_env)
    // Voxels
    const blocks_color_mapping = Object.values(BLOCKS_COLOR_MAPPING)
    const { voxelmap_viewer, terrain_viewer, heightmap_atlas, clutter_viewer, disablePatchLod, set_water_level } = init_voxel_engine(blocks_color_mapping, lod_blocks_provider)
    terrain_viewer.setLod(camera.position, 50, camera.far)
    // terrain_viewer.parameters.lod.enabled = true
    terrain_viewer.update(renderer)
    voxelmap_viewer.setAdaptativeQuality({
        distanceThreshold: 75,
        cameraPosition: camera.getWorldPosition(new Vector3()),
    })
    scene.add(terrain_viewer.container)
    // Physics
    PhysicsEngine.instance(scene, camera)
    // Chunks rendering
    const renderWorldChunk = setup_chunks_rendering(voxelmap_viewer, disablePatchLod)
    // App context
    populateAppContext()
    // UI
    const { refreshUIPanel } = initUIPanel(world_demo_env)

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
    const boardBrovider = get_board_provider(world_demo_env, AppState.playerPos)
    const toggleBoard = () => boardBrovider().then(board => {
        const { boardData, boardChunks, originalChunks } = board
        console.log(boardData)
        const renderBoardChunks = (chunks) => {
            for (const chunk of chunks) {
                renderWorldChunk(chunk.toStub())
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
    // const globalPurposeWorkerpool = await initGlobalPurposeWorkerpool(world_demo_env)

    // Minimap
    // const patchDims = world_demo_env.getPatchDimensions()
    setupMinimap(worldMainProvider)

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
        renderWorldChunk,
        cameraControls,
        follow_player,
        updateThreeStats,
        refreshUIPanel,
        worldMainProvider,
    }
}











