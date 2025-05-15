import { Vector2 } from 'three'
import { PATCH_SIZE } from '../config/app-settings'
import { LinkedList } from '../../../aresrpg-world/dist/datacontainers/LinkedList'
import { MapRenderLayer } from './map-render-layer'

// const PATCH_VIEW_RANGE = 4
// const MAP_RADIUS = 256

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
        canvasContext.beginPath()
        canvasContext.arc(x, y, mapRadius, 0, 2 * Math.PI)
        canvasContext.clip() // Apply the clipping path
    }

    drawPoint(point: Vector2, { color, radius } = { color: 'black', radius: 1 }) {
        const { canvasContext } = this
        canvasContext.fillStyle = color
        canvasContext.beginPath()
        canvasContext.arc(point.x, point.y, radius, 0, Math.PI * 2) // Draw circle
        canvasContext.fill() // Fill the circle
    }

    refresh(mapCenter: Vector2) {
        const { canvasContext, canvasContainer, mapRenderLayers, mapViewRange, mapRadius } = this
        const { width, height } = canvasContainer
        mapCenter.floor()
        // Minimap.clear()
        // Minimap.clearRadius(Minimap.mapRadius)
        canvasContext.clearRect(0, 0, width, height)
        this.clipContent(mapRadius)

        for (const renderLayer of mapRenderLayers.forwardIter()) {
            const { patchDim } = renderLayer.data
            const offsetX = (mapCenter.x % patchDim.x) + (mapCenter.x < 0 ? patchDim.x / 2 : -patchDim.x / 2)
            const offsetY = (mapCenter.y % patchDim.y) + (mapCenter.y < 0 ? patchDim.y / 2 : -patchDim.y / 2)
            renderLayer.data.refresh(mapCenter, mapViewRange)
            const { offscreenCanvas } = renderLayer.data
            const { width: targetWidth, height: targetHeight } = canvasContainer
            const { width: sourceWidth, height: sourceHeight } = offscreenCanvas
            canvasContext.drawImage(offscreenCanvas, offsetX, offsetY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight)
        }
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

export class GroundMinimap extends Minimap {}

export class SpawnMinimap extends Minimap {}
