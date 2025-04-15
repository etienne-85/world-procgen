import { asVect2, WorldModules } from "@aresrpg/aresrpg-world";
import { Box2, Vector2 } from "three";
import { AppState } from "../app-context";
import { AsyncMapDataProvider, MapDataProvider } from "../setup/world-setup";

const MAP_RADIUS = 256
const MAP_MODES_COUNT = 8

enum MapMode {
    Spawned,
    Points64,
    Points48,
    Points32,
    Points24,
    Points16,
    Points8,
    Points4,
}

const filterSizeMappings: Partial<Record<MapMode, number>> = {
    [MapMode.Points64]: 64,
    [MapMode.Points48]: 48,
    [MapMode.Points32]: 32,
    [MapMode.Points24]: 24,
    [MapMode.Points16]: 16,
    [MapMode.Points8]: 8,
    [MapMode.Points4]: 4,
}

export class Minimap {
    canvasContainer
    canvasContext
    worldProvider
    mapDataProvider
    mapRadius
    mapData: [] = []
    lastMapOrigin?: Vector2
    mapMode = 0

    constructor(canvasContainer: HTMLCanvasElement, mapDataProvider: MapDataProvider | AsyncMapDataProvider, worldProvider: WorldModules) {
        this.canvasContainer = canvasContainer
        this.canvasContainer.addEventListener('click', (event) => {
            this.mapMode = (this.mapMode + 1) % MAP_MODES_COUNT
            console.log(`map mode switched to ${this.mapMode}`)
            this.refreshData(true)
        })

        this.canvasContext = canvasContainer.getContext('2d') as CanvasRenderingContext2D
        this.mapDataProvider = mapDataProvider
        this.mapRadius = MAP_RADIUS
        this.worldProvider = worldProvider
    }

    get mapOrigin() {
        const { playerPos } = AppState
        const mapOrigin = asVect2(playerPos)
        return mapOrigin
    }

    get mapDimensions() {
        return new Vector2(1, 1).multiplyScalar(2 * this.mapRadius)
    }

    get mapArea() {
        const mapArea = new Box2().setFromCenterAndSize(this.mapOrigin, this.mapDimensions)
        return mapArea
    }

    get mapExtendedArea() {
        const mapExtendedArea = this.mapArea.clone().expandByScalar(512)
        return mapExtendedArea
    }

    get mapOffset() {
        const offset = this.mapArea.min.clone().negate()
        return offset
    }

    get mapLocalCenter() {
        const { canvasContext, canvasContainer } = this
        const { width, height } = canvasContainer
        const center = new Vector2(width, height).divideScalar(2)
        return center
    }

    clearCanvas() {
        const { canvasContext, canvasContainer } = this
        const { width, height } = canvasContainer
        // canvasContext.fillStyle = 'black';
        canvasContext.clearRect(0, 0, width, height)
    }

    clearCanvasWithinRadius() {
        const { canvasContext } = this
        const { x, y } = this.mapLocalCenter
        // Set the fill color to black
        canvasContext.fillStyle = 'black';
        // Draw a filled circle at position (250, 250) with radius 100
        canvasContext.beginPath();
        canvasContext.arc(x, y, this.mapRadius, 0, 2 * Math.PI); // Circle with center (250, 250) and radius 100
        canvasContext.fill(); // Fill the circle with the current fillStyle (black)
    }

    drawPoint(point: Vector2, { color, radius } = { color: 'black', radius: 1 }) {
        const { canvasContext } = this
        canvasContext.fillStyle = color
        canvasContext.beginPath();
        canvasContext.arc(point.x, point.y, radius, 0, Math.PI * 2); // Draw circle
        canvasContext.fill(); // Fill the circle
    }

    drawText(point: Vector2, num: number) {
        const { canvasContext } = this
        const textSize = 22
        canvasContext.font = `${textSize}px Arial`;
        canvasContext.fillStyle = 'white';
        const offset = 8//new Vector2(-1, 1)//.multiplyScalar(num/4)
        canvasContext.fillText(num + '', point.x - 1.6 * offset, point.y + offset);
    }

    drawCircle(center: Vector2, radius: number) {
        const { canvasContext } = this
        canvasContext.strokeStyle = 'red';
        canvasContext.lineWidth = 2
        canvasContext.beginPath();
        canvasContext.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        canvasContext.stroke();
    }

    async refreshData(forceRefresh = false) {
        const { mapOrigin, lastMapOrigin, mapDataProvider, mapExtendedArea, mapMode } = this
        if (forceRefresh || !lastMapOrigin || mapOrigin.distanceTo(lastMapOrigin) > 256) {
            // this.itemsDistribution.queryMapArea(mapArea)
            this.lastMapOrigin = this.mapOrigin
            const { discreteDistributionMap } = this.worldProvider.spawnDistributionMap
            const distributionData = discreteDistributionMap.querySpawnSlots(mapExtendedArea)

            const spawnedItems = []
            if (mapMode === MapMode.Spawned) {
                const spawnData = await mapDataProvider(mapExtendedArea)
                spawnData.forEach(({ spawnType, spawnOrigin, spawnPass, spawnStage  }) => spawnedItems.push({ type: spawnType, pos: asVect2(spawnOrigin), isDiscarded: !!spawnPass }))
            } else {
                const mapData = discreteDistributionMap.querySpawnSlots(mapExtendedArea)
                Object.entries(mapData).map(([type, spawned]) => {
                    spawned.forEach(pos => spawnedItems.push({ type, pos }))
                })
            }

            this.mapData = spawnedItems

            // for (const [itemType, spawnList] of Object.entries(mapData)) {
            //     ItemsInventory.
            // }
            console.log(`resfreshed map data`)
        }
    }

    displayMode(mapItem: any) {
        const { mapMode } = this
        const { mapPos, type, isDiscarded } = mapItem
        if (mapMode === MapMode.Spawned) {
            const color =  isDiscarded ? '#505050' : 'white'
            const radius = 2 //maxSpawnRadius * sizeMultiplier
            this.drawPoint(mapPos, { color, radius })
        }
        else {
            const spawnSize = parseInt(type)
            const selectedSize = filterSizeMappings[mapMode]
            const color = spawnSize === selectedSize ? 'red' : 'white'
            const radius = spawnSize === selectedSize ? selectedSize > 8 ? 4 : 2 : 1 //maxSpawnRadius * sizeMultiplier
            this.drawPoint(mapPos, { color, radius })
            spawnSize >= selectedSize && selectedSize > 8 && this.drawCircle(mapPos, selectedSize / 2)
            // const { maxSpawnRadius } = mapItem
            // const sizeMultiplier = 0.4
            // const color = sizeColorMappings[maxSpawnRadius] || 'gray'
            // const radius = maxSpawnRadius * sizeMultiplier
            // this.drawPoint(mapPos, { color, radius })
            // maxSpawnRadius >= 32 && this.drawText(mapPos, maxSpawnRadius)
        }
    }

    refreshDisplay() {
        const { mapData, mapRadius, mapLocalCenter, mapOffset } = this
        this.clearCanvas()
        this.clearCanvasWithinRadius()
        mapData
            .map(element => {
                const mapPos = element.pos.clone().add(mapOffset)
                return { ...element, mapPos }
            })
            .filter(mapItem => mapItem.mapPos.distanceTo(mapLocalCenter) <= mapRadius)
            .forEach(mapItem => this.displayMode(mapItem))
        this.drawPoint(mapLocalCenter, { color: 'white', radius: 5 })
        this.refreshData()
    }
}