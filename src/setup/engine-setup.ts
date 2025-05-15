import * as THREE from 'three'

import {
    ClutterViewer,
    EComputationMethod,
    HeightmapAtlasAutonomous,
    HeightmapViewerGpu,
    MaterialsStore,
    TerrainViewer,
    VoxelmapViewer,
    WaterData,
} from '@aresrpg/aresrpg-engine'
import { CHUNK_AXIS_ORDER, CHUNK_SIZE, CHUNKS_RANGE, WORLD_ALTITUDE_RANGE } from '../config/app-settings'
import { Color } from 'three'
import { fake_lod_data_provider } from './world-setup'
import { BlockMapping, SPRITES_CONF_MAPPING } from '../../../aresrpg-world/test/configs/blocks_mappings'
import { PatchId } from '../../../aresrpg-world/src/utils/common_types'

const USE_FAKE_LOD_DATA = false

export function init_voxel_engine(blocks_color_mapping: BlockMapping[], blocksProvider: any) {
    const voxel_materials_list = blocks_color_mapping.map(material => ({
        color: new Color(material.color),
        emissiveness: material.emissive ?? 0,
    }))
    // const getWaterColorForPatch = (patch_x: number, patch_z: number)=> {
    const set_water_level = (level: number) => {
        map.waterLevel = level
    }
    const getWaterColorForPatch = () => {
        const color = [41, 182, 246]
        return color as [number, number, number]
    }
    const map = {
        altitude: WORLD_ALTITUDE_RANGE,
        voxelTypesDefininitions: {
            solidMaterials: voxel_materials_list,
            clutterVoxels: Object.values(SPRITES_CONF_MAPPING).map(sprite => ({
                type: 'grass-2d' as 'grass-2d',
                texture: new THREE.TextureLoader().load(sprite.file, texture => {
                    texture.magFilter = THREE.NearestFilter
                    texture.minFilter = THREE.NearestFilter
                    texture.colorSpace = THREE.LinearSRGBColorSpace
                }),
                width: sprite.width,
                height: sprite.height,
            })),
        },
        waterLevel: 0,
        getWaterColorForPatch,
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
    const get_chunk_vertical_ids = () => {
        const ids_range = CHUNKS_RANGE.top - CHUNKS_RANGE.bottom + 1
        const vertical_ids = new Array(ids_range).fill(0).map((_, index) => CHUNKS_RANGE.bottom + index)
        return vertical_ids
    }
    console.log(get_chunk_vertical_ids())
    const requiredChunksYForColumnCompleteness: number[] = [] //get_chunk_vertical_ids()
    const voxelmap_viewer = new VoxelmapViewer({
        chunkSize: CHUNK_SIZE,
        requiredChunksYForColumnCompleteness,
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

    // const minimap = new Minimap({
    //     heightmapAtlas: heightmap_atlas,
    //     waterData: water_data,
    //     meshPrecision: 64,
    //     minViewDistance: 100,
    //     maxViewDistance: 750,
    //     markersSize: 0.025,
    // })

    const disablePatchLod = (patchId: PatchId) => voxelmap_viewer.setRequiredChunkYsForColumnCompleteness(patchId.x, patchId.y, [])

    return {
        clutter_viewer,
        voxelmap_viewer,
        terrain_viewer,
        // minimap,
        heightmap_atlas,
        water_data,
        set_water_level,
        disablePatchLod,
    }
}
