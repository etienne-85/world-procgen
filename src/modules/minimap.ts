import { asVect2, WorldModules } from "@aresrpg/aresrpg-world";
import { Box2, Vector2 } from "three";
import { App } from "../app";
import { MapDataProvider } from "./procedural";

const MAP_RADIUS = 256
const sizeColorMappings = {
    64: 'red',
    48: 'blue',
    32: 'green'
}

const MAP_MODES_COUNT = 8

enum MapMode {
    Spawned,
    AllPoints,
    Points64,
    Points48,
    Points32,
    Points24,
    Points16,
    Points8,
}

const filterSizeMappings: Partial<Record<MapMode, number>> = {
    [MapMode.Points64]: 64,
    [MapMode.Points48]: 48,
    [MapMode.Points32]: 32,
    [MapMode.Points24]: 24,
    [MapMode.Points16]: 16,
    [MapMode.Points8]: 8,
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

    constructor(canvasContainer: HTMLCanvasElement, mapDataProvider: MapDataProvider, worldProvider: WorldModules) {
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
        const { playerPos } = App.instance.state
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

    async refreshData(forceRefresh = false) {
        const { mapOrigin, lastMapOrigin, mapDataProvider, mapExtendedArea, mapMode } = this
        if (forceRefresh || !lastMapOrigin || mapOrigin.distanceTo(lastMapOrigin) > 256) {
            // this.itemsDistribution.queryMapArea(mapArea)
            this.lastMapOrigin = this.mapOrigin

            if (mapMode === MapMode.Spawned) {
                const mapData = await mapDataProvider(mapExtendedArea)
                const spawnedItems = []
                Object.entries(mapData).map(([type, spawned]) => {
                    spawned
                        .map(pos => asVect2(pos))
                        .forEach(pos => spawnedItems.push({ type, pos }))
                })
                this.mapData = spawnedItems
            } else {
                const filterSize = filterSizeMappings[mapMode]
                const { discreteDistributionMap } = this.worldProvider.itemsMapDistribution
                const distributionData = discreteDistributionMap.queryMapElements(mapExtendedArea)
                const elements = distributionData.filter(element => filterSize ? element.maxSpawnRadius === filterSize : true)
                this.mapData = elements //mapData
            }

            // for (const [itemType, spawnList] of Object.entries(mapData)) {
            //     ItemsInventory.
            // }
            console.log(`resfreshed map data`)
        }
    }

    handleMode(mapItem: any) {
        const { mapMode } = this
        const { mapPos } = mapItem
        if (mapMode === MapMode.Spawned) {
            const color = 'green'
            const radius = 4 //maxSpawnRadius * sizeMultiplier
            this.drawPoint(mapPos, { color, radius })
        }
        else if (mapMode === MapMode.AllPoints) {
            const color = 'white'
            const radius = 1
            this.drawPoint(mapPos, { color, radius })
        }
        else {
            const { maxSpawnRadius } = mapItem
            const sizeMultiplier = 0.4
            const color = sizeColorMappings[maxSpawnRadius] || 'gray'
            const radius = maxSpawnRadius * sizeMultiplier
            this.drawPoint(mapPos, { color, radius })
            maxSpawnRadius >= 32 && this.drawText(mapPos, maxSpawnRadius)
        }
    }

    refreshDisplay() {
        const { mapData, mapRadius, mapLocalCenter } = this
        this.clearCanvas()
        this.clearCanvasWithinRadius()
        mapData
            .map(element => {
                const mapPos = element.pos.clone().add(this.mapOffset)
                return { ...element, mapPos }
            })
            .filter(mapItem => mapItem.mapPos.distanceTo(mapLocalCenter) <= mapRadius)
            .forEach(mapItem => this.handleMode(mapItem))
        this.drawPoint(mapLocalCenter, { color: 'white', radius: 5 })
        this.refreshData()
    }
}