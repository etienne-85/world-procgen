import { asVect2, ItemsTask, WorkerPool } from "@aresrpg/aresrpg-world";
import { Vector2 } from "three";
import { SpawnData } from "../../../aresrpg-world/src/factory/ChunksFactory";
import { DiscardedSlot } from "../../../aresrpg-world/src/processing/ItemsProcessing";
import { PATCH_SIZE } from "../config/app-settings";
import { LinkedList } from "../../../aresrpg-world/dist/datacontainers/LinkedList";
import { MapRenderLayer } from "./map-render-layer";

const PATCH_VIEW_RANGE = 4
const MAP_RADIUS = 256

export class Minimap {
    static current: LinkedList<Minimap>
    mapRenderLayers: LinkedList<MapRenderLayer>
    canvasContainer: HTMLCanvasElement
    static patchDim = new Vector2(PATCH_SIZE, PATCH_SIZE)
    mapViewRange = 8

    constructor(canvasContainer: HTMLCanvasElement, mapRenderLayers: MapRenderLayer[]) {
        this.canvasContainer = canvasContainer
        canvasContainer.addEventListener('click', Minimap.switchMap)
        if (!Minimap.current) {
            Minimap.current = new LinkedList<Minimap>(this)
        } else {
            Minimap.current.last.insertItem(this)
        }
        // Minimap.instances = Minimap.instances? Minimap.instances.insertItem(this).first: new LinkedList<Minimap>(this)
        this.mapRenderLayers = LinkedList.fromArrayStub(mapRenderLayers) as LinkedList<MapRenderLayer>
    }

    static get currentMap() {
        return this.current.data
    }

    get canvasContext() {
        return this.canvasContainer.getContext('2d') as CanvasRenderingContext2D
    }

    get mapRadius() {
        return this.canvasContainer.width / 2
    }

    // get mapDimensions() {
    //     return new Vector2(1, 1).multiplyScalar(2 * this.offscreenMapRadius)
    // }

    // get mapArea() {
    //     const mapArea = new Box2().setFromCenterAndSize(this.mapOrigin, this.mapDimensions)
    //     return mapArea
    // }

    // get mapExtendedArea() {
    //     const mapExtendedArea = this.mapArea.clone().expandByScalar(512)
    //     return mapExtendedArea
    // }

    // get mapOffset() {
    //     const offset = this.mapArea.min.clone().negate()
    //     return offset
    // }

    // get mapMode() {
    //     return Minimap.currentMapId - this.instanceId
    // }

    // refreshNeeded() {
    //     const { mapOrigin, lastMapOrigin } = this
    //     const refreshNeeded = !lastMapOrigin || mapOrigin.distanceTo(lastMapOrigin) > 256
    //     if (refreshNeeded) {
    //         this.lastMapOrigin = mapOrigin
    //     }
    //     return refreshNeeded
    // }

    get canvasCenter() {
        const { canvasContainer } = this
        const { width, height } = canvasContainer
        const center = new Vector2(width, height).divideScalar(2)
        return center
    }

    static switchMap = () => {
        this.current = this.current.next || this.current.first
    }

    clipContent(mapRadius: number) {
        const { canvasContext } = this
        const { x, y } = this.canvasCenter
        // Create a circular clipping path
        canvasContext.beginPath();
        canvasContext.arc(x, y, mapRadius, 0, 2 * Math.PI);
        canvasContext.clip(); // Apply the clipping path
    }

    drawPoint(point: Vector2, { color, radius } = { color: 'black', radius: 1 }) {
        const { canvasContext } = this
        canvasContext.fillStyle = color
        canvasContext.beginPath();
        canvasContext.arc(point.x, point.y, radius, 0, Math.PI * 2); // Draw circle
        canvasContext.fill(); // Fill the circle
    }

    refresh(mapCenter: Vector2) {
        const { canvasContext, canvasContainer, mapRenderLayers, mapViewRange, mapRadius } = this
        mapCenter.floor()
        // Minimap.clear()
        // Minimap.clearRadius(Minimap.mapRadius)
        this.clipContent(mapRadius)
        const { patchDim } = mapRenderLayers.data
        const offsetX = mapCenter.x % patchDim.x + (mapCenter.x < 0 ? patchDim.x / 2 : - patchDim.x / 2)
        const offsetY = mapCenter.y % patchDim.y + (mapCenter.y < 0 ? patchDim.y / 2 : -patchDim.y / 2)
        mapRenderLayers.data.refresh(mapCenter, mapViewRange)
        const { offscreenCanvas } = mapRenderLayers.data
        const { width: targetWidth, height: targetHeight } = canvasContainer
        const { width: sourceWidth, height: sourceHeight } = offscreenCanvas
        canvasContext.drawImage(offscreenCanvas, offsetX, offsetY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
        this.drawPoint(this.canvasCenter, { color: 'red', radius: 5 })

        // for (const patchKey of currentMap.patchDataProvider.visiblePatchKeys) {
        //     const patchBounds = asPatchBounds(patchKey, patchDim)
        //     const sourceData = this.currentMap.patchDataProvider.patchDataIndex[patchKey]
        //     const sourcePos = new Vector2(0, 0)
        //     const patchOrigin = patchBounds.min
        //     const patchOffset = patchOrigin.clone().sub(mapOrigin).round()
        //     const patchTopLeft = new Vector2(patchBounds.min.x, patchBounds.max.y)
        //     const targetPos = this.mapLocalCenter.add(patchOffset).add(new Vector2(0, -64))
        //     // Minimap.canvasContext.drawImage(patchData, mapOrigin.x, mapOrigin.y, width, height, 0, 0, width, height);
        //     Minimap.canvasContext.putImageData(sourceData, targetPos.x, targetPos.y, sourcePos.x, sourcePos.y, sourceData.width, sourceData.height);
        //     Minimap.drawPoint(Minimap.mapLocalCenter, { color: 'white', radius: 5 })
        // }


        // currentMap.updateMapData()
    }

    // abstract updateMapData(): void
    // abstract offscreenMapRender(): void
}

export class GroundMinimap extends Minimap {

}

export class SpawnMinimap extends Minimap {

}

type SpawnedMapSpot = {
    type: string | undefined;
    pos: Vector2;
    isDiscarded: boolean;
}

export class SpawnedMinimap extends Minimap<SpawnedMapSpot> {
    workerPool

    constructor(workerPool: WorkerPool) {
        super();
        this.workerPool = workerPool
    }

    get mapSource() {
        const itemsTask = new ItemsTask().spawnedElements(this.mapExtendedArea)
        itemsTask.processingParams.skipPostprocessing = true
        itemsTask.processingParams.skipOverlapPruning = false
        return itemsTask
    }

    async updateMapData(forceRefresh?: boolean) {
        if (forceRefresh || this.refreshNeeded()) {
            const spawnData = await this.mapSource.delegate(this.workerPool) as (SpawnData | DiscardedSlot)[]
            this.mapData = spawnData.map(data => {
                const { spawnType, spawnOrigin, spawnPass, spawnStage } = data
                const mapData = {
                    type: spawnType,
                    pos: asVect2(spawnOrigin),
                    isDiscarded: !!spawnPass
                }
                return mapData
            })
            console.log(`retrieved map items count: ${this.mapData.length}`)
            this.offscreenMapRender()
        }
    }

    renderMapSpot(mapPos: Vector2, mapSpot: SpawnedMapSpot) {
        // const { mapMode } = this
        const { isDiscarded } = mapSpot
        const color = isDiscarded ? '#505050' : 'white'
        const radius = 2 //maxSpawnRadius * sizeMultiplier
        this.drawPoint(mapPos, { color, radius })
    }

    offscreenMapRender() {
        const { mapData, mapOffset } = this
        this.clear()
        mapData.map(mapSpot => ({
            mapPos: mapSpot.pos.clone().add(mapOffset),
            mapSpot
        }))
            // .filter(({ mapPos }) => mapPos.distanceTo(mapLocalCenter) <= Minimap.mapRadius)
            .forEach(({ mapPos, mapSpot }) => this.renderMapSpot(mapPos, mapSpot))
    }
}

export class SpawnSpotsMinimap extends Minimap<any> {
    mapSource
    constructor(mapSource: SpawnDistributionMap) {
        super();
        this.mapSource = mapSource
    }

    async updateMapData(forceRefresh?: boolean) {
        const { mapExtendedArea, mapSource } = this
        if (forceRefresh || this.refreshNeeded()) {
            const { discreteDistributionMap } = mapSource
            this.mapData = []
            const mapData = discreteDistributionMap.querySpawnSlots(mapExtendedArea)
            Object.entries(mapData).map(([type, spawned]) => {
                spawned.forEach(pos => this.mapData.push({ type, pos }))
            })
        }
        console.log(`retrieved map items count: ${this.mapData.length}`)
    }

    renderMapSpot(mapPos: Vector2, mapSpot: SpawnedMapSpot) {
        const color = 'white'
        const radius = 1
        this.drawPoint(mapPos, { color, radius })
    }

    // renderFilter() {
    //     const spawnSize = parseInt(type)
    //     const selectedSize = filterSizeMappings[mapMode]
    //     const color = spawnSize === selectedSize ? 'red' : 'white'
    //     const radius = spawnSize === selectedSize ? selectedSize > 8 ? 4 : 2 : 1 //maxSpawnRadius * sizeMultiplier
    //     Minimap.drawPoint(mapPos, { color, radius })
    //     spawnSize >= selectedSize && selectedSize > 8 && Minimap.drawCircle(mapPos, selectedSize / 2)
    // }

    offscreenMapRender() {
        const { mapData, mapRadius, mapOffset } = this
        mapData.map(mapSpot => ({
            mapPos: mapSpot.pos.clone().add(mapOffset),
            mapSpot
        }))
            // .filter(({ mapPos }) => mapPos.distanceTo(mapLocalCenter) <= mapRadius)
            .forEach(({ mapPos, mapSpot }) => this.renderMapSpot(mapPos, mapSpot))
    }
}

