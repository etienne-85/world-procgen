import { BLOCKS_COLOR_MAPPING } from "../../aresrpg-world/test/configs/blocks_mappings"
import { getWorldDemoEnv } from '../../aresrpg-world/test/configs/world_demo_setup'
import { chunksWsClient } from '../../aresrpg-world/test/chunks_over_ws_client'
import { WorkerPool, BlocksProcessing, ChunksPolling, getPatchId, asVect2 } from '@aresrpg/aresrpg-world';
import workerUrl from '@aresrpg/aresrpg-world/worker?url'
import {
    ClutterViewer,
    EComputationMethod,
    HeightmapAtlas,
    HeightmapViewerGpu,
    MaterialsStore,
    Minimap,
    TerrainViewer,
    VoxelmapViewer,
    WaterData,
} from '@aresrpg/aresrpg-engine'


import { AmbientLight, Color, DirectionalLight, PCFSoftShadowMap, Vector2, Vector3 } from 'three'

export const chunk_size = { xz: 64, y: 64 }
const altitude = { min: -1, max: 400 }

const blocks_color_mapping = Object.values(BLOCKS_COLOR_MAPPING)
const voxel_materials_list = blocks_color_mapping.map(material =>
    typeof material === 'object'
        ? { color: new Color(material.color), emissiveness: material.emission ?? 1 }
        : { color: new Color(material), emissiveness: 0 },
)

console.log(blocks_color_mapping)

export const worldDemoEnv = getWorldDemoEnv()

// use dedicated workerpool for LOD
const lod_workerpool = new WorkerPool
lod_workerpool.initPoolEnv(4, worldDemoEnv, workerUrl)


export function init_voxel_engine() {
    const map = {
        altitude,
        voxelTypesDefininitions: {
            solidMaterials: voxel_materials_list,
            clutterVoxels: [],
        },
        waterLevel: 0,
        getWaterColorForPatch(
        /** @type number */ patch_x,
        /** @type number */ patch_z,
        ) {
            const /** @type [number, number, number] */ color = [41, 182, 246]
            return color
        },
        async sampleHeightmap(/** @type Float32Array */ coords) {
            const samples_count = coords.length / 2
            const pos_batch = []
            for (let i = 0; i < samples_count; i++) {
                pos_batch.push(new Vector3(coords[2 * i + 0], 0, coords[2 * i + 1]))
            }

            const blocks_request = BlocksProcessing.getPeakPositions(pos_batch)
            const blocks_batch = await blocks_request.delegate(lod_workerpool)

            const result = {
                altitudes: new Float32Array(samples_count),
                materialIds: new Uint32Array(samples_count),
            }

            for (let i = 0; i < samples_count; i++) {
                const block_processing_output = blocks_batch[i]
                result.altitudes[i] = block_processing_output.data.level
                result.materialIds[i] = block_processing_output.data.type
            }

            return result
        },
    }

    const voxels_materials_store = new MaterialsStore({
        voxelMaterialsList: voxel_materials_list,
        maxShininess: 400,
    })

    const voxels_chunk_data_ordering = 'zxy'

    const clutter_viewer = new ClutterViewer({
        clutterVoxelsDefinitions: map.voxelTypesDefininitions.clutterVoxels,
        chunkSize: chunk_size,
        computationOptions: {
            method: 'worker',
            threadsCount: 1,
        },
        voxelsChunkOrdering: voxels_chunk_data_ordering,
    })

    const voxelmap_viewer = new VoxelmapViewer({
        chunkSize: chunk_size,
        chunkIdY: {
            min: worldDemoEnv.rawSettings.chunks.verticalRange.bottomId + 1,
            max: worldDemoEnv.rawSettings.chunks.verticalRange.topId,
        },
        voxelMaterialsStore: voxels_materials_store,
        clutterViewer: clutter_viewer,
        options: {
            computationOptions: {
                method: EComputationMethod.CPU_MULTITHREADED,
                threadsCount: 4,
                greedyMeshing: false,
            },
            voxelsChunkOrdering: voxels_chunk_data_ordering,
        },
    })

    const heightmap_atlas = new HeightmapAtlas({
        heightmap: map,
        materialsStore: voxels_materials_store,
        texelSizeInWorld: 2,
        leafTileSizeInWorld: voxelmap_viewer.chunkSize.xz,
    })

    const heightmap_viewer = new HeightmapViewerGpu({
        heightmapAtlas: heightmap_atlas,
        flatShading: true,
    })

    const terrain_viewer = new TerrainViewer(heightmap_viewer, voxelmap_viewer)
    terrain_viewer.parameters.lod.enabled = true

    const water_view_distance = 3000
    const patch_size = chunk_size.xz
    const water_data = new WaterData({
        map,
        patchesCount: Math.ceil((2 * water_view_distance) / patch_size),
        patchSize: chunk_size.xz,
    })

    const minimap = new Minimap({
        heightmapAtlas: heightmap_atlas,
        waterData: water_data,
        meshPrecision: 64,
        minViewDistance: 100,
        maxViewDistance: 750,
        markersSize: 0.025,
    })

    function set_water_level(level) {
        map.waterLevel = level
    }

    return {
        clutter_viewer,
        voxelmap_viewer,
        terrain_viewer,
        minimap,
        heightmap_atlas,
        water_data,
        set_water_level,
    }
}

/**
* Polling chunks either from remote or local source
*/

export const init_chunks_polling_service = on_chunk_ready => {
    let is_remote_available = false
    const { patchViewRanges } = worldDemoEnv.rawSettings
    const chunks_vertical_range = worldDemoEnv.getChunksVerticalRange()
    const chunks_polling = new ChunksPolling(
        patchViewRanges,
        chunks_vertical_range,
    )
    // skip compression for local gen
    chunks_polling.skipBlobCompression = true
    // create workerpool to produce chunks locally
    const chunks_workerpool = new WorkerPool()
    const get_visible_chunk_ids = chunks_polling.getVisibleChunkIds
    // try using remote source first
    const WS_URL = 'ws://localhost:3000'
    const { requestChunkOverWs, wsInitState } = chunksWsClient(
        WS_URL,
        on_chunk_ready,
    )

    wsInitState
        .then(() => {
            console.log(`chunks stream client service listening on ${WS_URL} `)
            is_remote_available = true
        })
        // fallback to using local source if failing
        .catch(() => {
            console.warn(
                `chunks stream client failed to start on ${WS_URL}, fallbacking to local gen `,
            )
            // init workerpool to produce chunks locally
            chunks_workerpool.initPoolEnv(4, worldDemoEnv, workerUrl).then(() => {
                console.log(`local chunks workerpool ready`)
            })
        })

    // this will look for chunks depending on current view state
    const poll_chunks = (current_pos, view_dist) => {
        // make sure service is available either from remote or local source
        if (is_remote_available || chunks_workerpool.ready) {
            const patch_dims = worldDemoEnv.getPatchDimensions() // WorldEnv.current.patchDimensions
            const view_pos = getPatchId(asVect2(current_pos), patch_dims)
            const view_range = getPatchId(new Vector2(view_dist), patch_dims).x
            const chunks_tasks = chunks_polling.pollChunks(view_pos, view_range)
            let pendingTasks = []
            if (is_remote_available) {
                const view_state = { viewPos: view_pos, viewRange: view_range }
                requestChunkOverWs(view_state)
            } else {
                pendingTasks = chunks_tasks?.map(task =>
                    task.delegate(chunks_workerpool),
                )
            }
            return pendingTasks
        }
        return []
    }
    return { poll_chunks, get_visible_chunk_ids }
}

export const setupLighting = (renderer, scene) => {
    const enableShadows = true
    const dirLight = new DirectionalLight(0xffffff, 1);
    dirLight.name = 'dirlight';
    dirLight.target.position.set(0, 0, 0);
    dirLight.position.set(100, 50, 100);
    scene.add(dirLight);
    // this.gui.add(dirLight, 'intensity', 0, 3).name('Directional light');

    const ambientLight = new AmbientLight(0xffffff);
    ambientLight.name = 'ambient-light';
    scene.add(ambientLight);
    // this.gui.add(ambientLight, 'intensity', 0, 3).name('Ambient light');

    if (enableShadows) {
        // const planeReceivingShadows = new Mesh(new PlaneGeometry(200, 200), new MeshPhongMaterial());
        // planeReceivingShadows.name = 'shadows-plane';
        // planeReceivingShadows.position.set(0, -20, 0);
        // planeReceivingShadows.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI / 4);
        // planeReceivingShadows.rotateOnAxis(new Vector3(0, 1, 0), Math.PI / 4);
        // planeReceivingShadows.receiveShadow = true;
        // scene.add(planeReceivingShadows);

        // const sphereCastingShadows = new THREE.Mesh(new THREE.SphereGeometry(10), new THREE.MeshPhongMaterial());
        // sphereCastingShadows.position.set(20, 30, 20);
        // sphereCastingShadows.castShadow = true;
        // scene.add(sphereCastingShadows);

        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 200;
        dirLight.shadow.camera.bottom = -200;
        dirLight.shadow.camera.left = -200;
        dirLight.shadow.camera.right = 200;

        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = PCFSoftShadowMap;
    }

    const lightColor = new Color(0xffffff);
    ambientLight.color = lightColor;
    ambientLight.intensity = 1;

    dirLight.color = lightColor;
    dirLight.intensity = 3;
}