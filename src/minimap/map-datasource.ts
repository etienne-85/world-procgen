import { Vector2 } from 'three'
import { IdenticalDataAdapter } from '../../../aresrpg-world/src/datacontainers/BlockDataAdapter'
import {
    PatchDataContainer,
    PatchDataStub,
    SparseDataPatch,
    SparseDataStub,
} from '../../../aresrpg-world/src/datacontainers/PatchContainer'
import { Noise2dSampler } from '../../../aresrpg-world/src/procgen/NoiseSampler'
import { PatchKey } from '../../../aresrpg-world/src/utils/common_types'
import { PatchPolling } from '../../../aresrpg-world/src/tools/PatchPolling'
import { SlotSize, SparseDistributionMap } from '../../../aresrpg-world/src/procgen/SparseDistributionMap'
import { SpawnData } from '../../../aresrpg-world/src/factory/ChunksFactory'
import { Spawn } from '@aresrpg/aresrpg-world'

export class NoisePatch extends PatchDataContainer<number> {
    rawData = new Uint8Array(this.dataSize)
    dataAdapter = new IdenticalDataAdapter()

    fill(noiseSource: Noise2dSampler) {
        for (const block of this.iterData()) {
            const { localPos } = block
            const rawNoise = noiseSource.eval(block.pos)
            const noiseLevel = Math.round(rawNoise * 255)
            this.writeData(localPos, noiseLevel)
        }
    }

    override fromKey(patchKey: PatchKey, patchDim: Vector2, patchMargin = 0) {
        super.fromKey(patchKey, patchDim, patchMargin)
        this.rawData = new Uint8Array(this.dataSize)
        return this
    }

    override fromStub(patchStub: PatchDataStub): this {
        super.fromStub(patchStub)
        const { rawdata } = patchStub
        if (rawdata) {
            this.rawData = new Uint8Array(this.dataSize)
            this.rawData.set(rawdata)
        } else {
            console.warn(
                'could not initialize PatchDataContainer properly: raw data missing. If this is an empty chunk, use ChunkContainer instead',
            )
        }
        return this
    }
}

type PatchProvider = (patchKey: string) => PatchDataStub | SparseDataStub<any>

// export const getNoisePatchProvider = (noiseSource: Noise2dSampler, patchDim: Vector2) => (patchKey: string) => {
//     const patch = new NoisePatch().fromKey(patchKey, patchDim)
//     patch.fill(noiseSource)
//     return patch.toStub()
// }

// export const getGroundPatchProvider = (noiseSource: Noise2dSampler, patchDim: Vector2) => (patchKey: string) => {
//     const patch = new GroundPatch().fromKey(patchKey, patchDim)
//     patch.bake()
//     return patch.toStub()
// }

export type PatchCache<DataType> = Record<string, DataType>
export type PatchDataCache = PatchCache<PatchDataStub>

/**
 * same datasource can be used by several render layers to render same data differently
 */
export class MapDatasource extends PatchPolling {
    patchDataCache: PatchDataCache = {}
    patchProvider: PatchProvider

    constructor(patchProvider: PatchProvider) {
        super()
        this.patchProvider = patchProvider
    }

    getPatchData(patchKey: PatchKey) {
        const patchData = this.patchDataCache[patchKey] || this.patchProvider(patchKey)
        return patchData
    }

    schedulePatches(patchIndex: Record<string, boolean>) {
        const scheduledPatches = super.schedulePatches(patchIndex)
        const patchesStubs = scheduledPatches.map(patchKey => this.patchProvider(patchKey))
        console.log(`retrieved map items count: ${patchesStubs.length} (total: ${this.visiblePatchKeys.length})`)

        return scheduledPatches
    }
}

export type SpawnSlot = {
    slotSize: SlotSize
    slotPos: Vector2
}

// interface SparseDatasource<DataType> {
//     querySparseData(mapQuery: Vector2[] | Box2): DataType[]
// }

// export class SpawnDatasource implements SparseDatasource<SpawnSlot> {
//     sparseDistributionMap: SparseDistributionMap

//     constructor(sparseDistributionMap: SparseDistributionMap) {
//         this.sparseDistributionMap = sparseDistributionMap
//     }

//     querySparseData(mapQuery: Vector2[] | Box2) {
//         const mapData = this.sparseDistributionMap.queryMap(mapQuery)
//         const sparseData: SpawnSlot[] = []
//         Object.entries(mapData).map(([slotSize, spawnSlots]) => {
//             spawnSlots.forEach(slotPos => sparseData.push({ slotSize: parseInt(slotSize), slotPos }))
//         })
//         return sparseData
//     }
// }

export class SpawnSpotsPatch extends SparseDataPatch<SpawnSlot> {
    fill(sparseDatasource: SparseDistributionMap) {
        // query data source on patch area
        const sparseData = sparseDatasource.queryMap(this.extendedBounds, true)
        Object.entries(sparseData).forEach(([slotSize, spawnSlots]) => {
            spawnSlots.forEach(slotPos => this.sparseData.push({ slotSize: parseInt(slotSize), slotPos }))
        })
    }
}

export class SpawnDataPatch extends SparseDataPatch<SpawnData> {
    fill(sparseDatasource: Spawn) {
        // query data source on patch area
        const sparseData = sparseDatasource.querySparseChunks(this.extendedBounds, true)
        sparseData.forEach(spawnChunk => {
            // const { spawnType, spawnOrigin, spawnPass, spawnStage } = data
            //     const mapData = {
            //         type: spawnType,
            //         pos: asVect2(spawnOrigin),
            //         isDiscarded: !!spawnPass
            //     }
            //     return mapData
            const spawnStub = spawnChunk.toLightStub()
            this.sparseData.push(spawnStub)
        })
    }
}
