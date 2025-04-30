import * as THREE from 'three'

import {
    ClutterViewer,
    EComputationMethod,
    HeightmapAtlasAutonomous,
    HeightmapViewerGpu,
    MaterialsStore,
    Minimap,
    TerrainViewer,
    VoxelmapViewer,
    WaterData,
} from '@aresrpg/aresrpg-engine'
import { CHUNK_AXIS_ORDER, CHUNK_SIZE, CHUNKS_RANGE, WORLD_ALTITUDE_RANGE } from '../config/app-settings'
import { Color } from 'three'
import { fake_lod_data_provider } from './world-setup'
import { SPRITES_CONF_MAPPING } from '../../../aresrpg-world/test/configs/blocks_mappings'

const USE_FAKE_LOD_DATA = false

export function init_voxel_engine(blocks_color_mapping: any, blocksProvider: any) {
    const voxel_materials_list = blocks_color_mapping.map(material =>
        typeof material === 'object'
            ? { color: new Color(material.color), emissiveness: material.emission ?? 1 }
            : { color: new Color(material), emissiveness: 0 },
    )
    const map = {
        altitude: WORLD_ALTITUDE_RANGE,
        voxelTypesDefininitions: {
            solidMaterials: voxel_materials_list,
            clutterVoxels: Object.values(SPRITES_CONF_MAPPING).map(sprite => ({
                type: 'grass-2d' as 'grass-2d',
                texture: new THREE.TextureLoader().load(sprite.file, texture => {
                    texture.magFilter = THREE.NearestFilter;
                    texture.minFilter = THREE.NearestFilter;
                    texture.colorSpace = THREE.LinearSRGBColorSpace;
                }),
                width: sprite.width,
                height: sprite.height,
            })),
        },
        waterLevel: 0,
        getWaterColorForPatch(
        /** @type number */ patch_x,
        /** @type number */ patch_z,
        ) {
            const /** @type [number, number, number] */ color = [41, 182, 246]
            return color
        },
        async sampleHeightmap(samples: Float32Array) {
            const lod_data = USE_FAKE_LOD_DATA ? fake_lod_data_provider(samples) : await blocksProvider(samples)

            const result = {
                altitudes: lod_data?.elevation || [],
                materialIds: lod_data?.type || [],
            }

            return result
        },
    }

    const voxels_materials_store = new MaterialsStore({
        voxelMaterialsList: voxel_materials_list,
        maxShininess: 400,
    })

    const clutter_viewer = new ClutterViewer({
        clutterVoxelsDefinitions: map.voxelTypesDefininitions.clutterVoxels,
        chunkSize: CHUNK_SIZE,
        computationOptions: {
            method: 'worker',
            threadsCount: 1,
        },
        voxelsChunkOrdering: CHUNK_AXIS_ORDER,
    })
    clutter_viewer.parameters.viewDistance = 2000

    const voxelmap_viewer = new VoxelmapViewer({
        chunkSize: CHUNK_SIZE,
        chunkIdY: {
            min: CHUNKS_RANGE.bottom,
            max: CHUNKS_RANGE.top,
        },
        voxelMaterialsStore: voxels_materials_store,
        clutterViewer: clutter_viewer,
        options: {
            computationOptions: {
                method: EComputationMethod.CPU_MULTITHREADED,
                threadsCount: 4,
                greedyMeshing: false,
            },
            voxelsChunkOrdering: CHUNK_AXIS_ORDER,
        },
    })

    const heightmap_atlas = new HeightmapAtlasAutonomous({
        heightmap: map,
        heightmapQueries: {
            interval: 200,
            batchSize: 2,
            maxParallelQueries: 20,
        },
        materialsStore: voxels_materials_store,
        texelSizeInWorld: 2,
        leafTileSizeInWorld: voxelmap_viewer.chunkSize.xz,
    })

    const heightmap_viewer = new HeightmapViewerGpu({
        heightmapAtlas: heightmap_atlas,
        flatShading: true,
    })

    const terrain_viewer = new TerrainViewer(heightmap_viewer, voxelmap_viewer)
    // terrain_viewer.parameters.lod.enabled = true

    const water_view_distance = 3000
    const patch_size = CHUNK_SIZE.xz
    const water_data = new WaterData({
        map,
        patchesCount: Math.ceil((2 * water_view_distance) / patch_size),
        patchSize: CHUNK_SIZE.xz,
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