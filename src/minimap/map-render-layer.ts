import { Box2, Vector2 } from 'three'
import { RenderPatchHelper } from './render-patch'
import {
    asVect2,
    BlockType,
    getPatchId,
    GroundPatch,
    Noise2dSampler,
    PatchDataStub,
    patchRangeToBounds,
    SparseDataPatch,
    SparseDataStub,
    SparseDistributionMap,
    Spawn,
    SpawnData,
    WorldModules,
} from '@aresrpg/aresrpg-world'
import { MapDatasource, NoisePatch, PatchCache, SpawnDataPatch, SpawnSlot, SpawnSpotsPatch } from './map-datasource'
import { BLOCKS_COLOR_MAPPING } from '../config/procedural/blocks_mappings'

// type MapCacheData = {
//     dataStub: PatchDataStub
//     imageData: ImageData
// }
// type PatchRenderer = (patchStub: PatchDataStub) => ImageData
type PatchRenderCache = PatchCache<ImageData>

export abstract class MapRenderLayer {
    patchDim: Vector2
    patchRenderCache: PatchRenderCache = {} // storing patches render data
    abstract mapDatasource: MapDatasource
    // patchRenderer: PatchRenderer
    offscreenCanvas: HTMLCanvasElement
    offscreenContext: CanvasRenderingContext2D

    constructor(patchDim: Vector2) {
        this.patchDim = patchDim
        // this.patchRenderer = patchRenderer
        this.offscreenCanvas = document.createElement('canvas')
        this.offscreenContext = this.offscreenCanvas.getContext('2d') as CanvasRenderingContext2D
    }

    get patchIndexRange() {
        return new Box2()
    }

    get mapOrigin() {
        const { patchIndexRange } = this
        return patchIndexRange.min
    }

    get mapDimensions() {
        const { mapDatasource, patchDim } = this
        const { patchRange } = mapDatasource
        const mapBounds = patchRangeToBounds(patchRange, patchDim) //.add(this.patchDim)
        const mapDim = mapBounds.getSize(new Vector2()).add(this.patchDim)
        return mapDim
    }

    getPatchCanvasHelper() {}

    abstract renderPatch(patchDataStub: PatchDataStub | SparseDataStub<any>): ImageData

    /**
     * render patches from top left to bottom right
     */
    renderPatches() {
        const { patchDim, offscreenCanvas, offscreenContext, mapDatasource } = this
        // update canvas to map dimensions
        offscreenCanvas.width = this.mapDimensions.x
        offscreenCanvas.height = this.mapDimensions.y
        const { min, max } = mapDatasource.patchRange
        for (let { y } = min; y <= max.y; y++) {
            for (let { x } = min; x <= max.x; x++) {
                const patchKey = `${x}:${y}`
                const offset = new Vector2(x - min.x, y - min.y).multiply(patchDim)
                // const offset = new Vector2(5,2).multiply(patchDim)
                if (!this.patchRenderCache[patchKey]) {
                    const patchData = this.mapDatasource.getPatchData(patchKey) //this.mapDatasource.patchDataCache[patchKey]
                    this.patchRenderCache[patchKey] = this.renderPatch(patchData)
                }
                const patchRenderData = this.patchRenderCache[patchKey]
                const { width, height } = patchRenderData
                offscreenContext?.putImageData(patchRenderData, offset.x, offset.y, 0, 0, width, height)
            }
        }
    }

    refresh(mapCenter: Vector2, patchRange: number) {
        const patchPos = getPatchId(mapCenter, this.patchDim)
        // refresh data source
        this.mapDatasource.pollData(patchPos, patchRange)
        // render new patches
        this.renderPatches()
    }
}

export class NoiseRenderLayer extends MapRenderLayer {
    mapDatasource: MapDatasource

    constructor(patchDim: Vector2, noiseSource: Noise2dSampler) {
        super(patchDim)
        const patchProvider = (patchKey: string) => {
            const patch = new NoisePatch().fromKey(patchKey, patchDim)
            patch.fill(noiseSource)
            return patch.toStub()
        }
        this.mapDatasource = new MapDatasource(patchProvider)
    }

    renderPatch(patchDataStub: PatchDataStub): ImageData {
        const { x: width, y: height } = patchDataStub.metadata.bounds.getSize(new Vector2())
        const patchRenderHelper = new RenderPatchHelper(width, height)
        const patch = new NoisePatch().fromStub(patchDataStub)
        for (const block of patch.iterData()) {
            const { localPos, data } = block
            const color = `rgb(${data}, ${data}, ${data})`
            const radius = 1
            patchRenderHelper.drawPoint(localPos, { color, radius })
        }
        return patchRenderHelper.toStub()
    }
}

export class GroundRenderLayer extends MapRenderLayer {
    worldProvider: WorldModules
    mapDatasource: MapDatasource
    constructor(patchDim: Vector2, worldProvider: WorldModules) {
        super(patchDim)
        this.worldProvider = worldProvider
        const patchProvider = (patchKey: string) => {
            const patch = new GroundPatch(undefined, 0).fromKey(patchKey, patchDim)
            patch.bake(worldProvider)
            return patch.toStub()
        }
        this.mapDatasource = new MapDatasource(patchProvider)
    }

    renderPatch(patchDataStub: PatchDataStub): ImageData {
        const { ground } = this.worldProvider
        const { x: width, y: height } = patchDataStub.metadata.bounds.getSize(new Vector2())
        const patchRenderHelper = new RenderPatchHelper(width, height)
        const patch = new GroundPatch(undefined, 0).fromStub(patchDataStub)
        for (const block of patch.iterData()) {
            const { localPos, data } = block
            if (data) {
                const { biome, landIndex } = data
                const biomeLand = ground.biomes[biome].nth(landIndex).data
                const blockType = biomeLand.type as BlockType
                const blockColor = BLOCKS_COLOR_MAPPING[blockType].color
                // const rescaledLevel = Math.min(0.75 * level, 256)

                const color = '#' + blockColor.toString(16).padStart(6, '0') //`rgb(${rescaledLevel}, ${rescaledLevel}, ${rescaledLevel})`
                const radius = 1
                patchRenderHelper.drawPoint(localPos, { color, radius })
            }
        }
        return patchRenderHelper.toStub()
    }
}

export class SpotsRenderLayer extends MapRenderLayer {
    mapDatasource: MapDatasource

    constructor(patchDim: Vector2, sparseDatasource: SparseDistributionMap) {
        super(patchDim)
        const patchProvider = (patchKey: string) => {
            const patch = new SpawnSpotsPatch().fromKey(patchKey, patchDim)
            patch.fill(sparseDatasource)
            return patch.toStub()
        }
        this.mapDatasource = new MapDatasource(patchProvider)
    }

    // renderFilter() {
    //     const spawnSize = parseInt(type)
    //     const selectedSize = filterSizeMappings[mapMode]
    //     const color = spawnSize === selectedSize ? 'red' : 'white'
    //     const radius = spawnSize === selectedSize ? selectedSize > 8 ? 4 : 2 : 1 //maxSpawnRadius * sizeMultiplier
    //     Minimap.drawPoint(mapPos, { color, radius })
    //     spawnSize >= selectedSize && selectedSize > 8 && Minimap.drawCircle(mapPos, selectedSize / 2)
    // }

    renderPatch(sparseDataStub: SparseDataStub<SpawnSlot>): ImageData {
        const { sparsedata } = sparseDataStub
        const color = 'black'
        const radius = 2
        const { x: width, y: height } = sparseDataStub.metadata.bounds.getSize(new Vector2())
        const patchRenderHelper = new RenderPatchHelper(width, height)
        const patch = new SparseDataPatch(undefined, 0).fromStub(sparseDataStub)
        sparsedata.forEach(slotData => {
            const { slotPos } = slotData
            const localPos = patch.toLocalPos(slotPos)
            patchRenderHelper.drawPoint(localPos, { color, radius })
        })
        return patchRenderHelper.toStub()
    }
}

export class SpawnRenderLayer extends MapRenderLayer {
    mapDatasource: MapDatasource

    constructor(patchDim: Vector2, sparseDatasource: Spawn) {
        super(patchDim)
        const patchProvider = (patchKey: string) => {
            const patch = new SpawnDataPatch().fromKey(patchKey, patchDim)
            patch.fill(sparseDatasource)
            return patch.toStub()
        }
        this.mapDatasource = new MapDatasource(patchProvider)
    }

    renderPatch(sparseDataStub: SparseDataStub<SpawnData>): ImageData {
        const { sparsedata } = sparseDataStub
        const color = 'black' //isDiscarded ? '#505050' : 'white'
        const radius = 2 //maxSpawnRadius * sizeMultiplier
        const { x: width, y: height } = sparseDataStub.metadata.bounds.getSize(new Vector2())
        const patchRenderHelper = new RenderPatchHelper(width, height)
        // patchRenderHelper.background('black')
        const patch = new SpawnDataPatch(undefined, 0).fromStub(sparseDataStub)
        sparsedata.forEach(spawnData => {
            const { spawnOrigin } = spawnData
            const localPos = patch.toLocalPos(asVect2(spawnOrigin))
            patchRenderHelper.drawPoint(localPos, { color, radius })
        })
        return patchRenderHelper.toStub()
    }
}
