import { Vector2 } from "three";


export class RenderPatchHelper {
    canvasContainer: HTMLCanvasElement
    canvasContext: CanvasRenderingContext2D

    constructor(width: number, height: number) {
        // this.instanceId = Minimap.instances.length
        // Minimap.instances.push(this)
        this.canvasContainer = document.createElement("canvas");
        this.canvasContainer.width = width
        this.canvasContainer.height = height
        this.canvasContext = this.canvasContainer.getContext("2d") as CanvasRenderingContext2D;
    }

    clear() {
        const { canvasContainer, canvasContext } = this
        const { width, height } = canvasContainer
        // canvasContext.fillStyle = 'black';
        canvasContext.clearRect(0, 0, width, height)
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

    toStub() {
        const { width, height } = this.canvasContainer
        const imageData = this.canvasContext.getImageData(0, 0, width, height)
        return imageData
    }
}

// export class NoiseRenderPatch extends RenderPatch<PatchDataStub> {
//     renderToCanvas(): void {
//         const { patchStub } = this
//         const patch = new NoisePatch().fromStub(patchStub)
//         for (const block of patch.iterData()) {
//             const { localPos, data } = block
//             const color = `rgb(${data}, ${data}, ${data})`
//             const radius = 1
//             this.drawPoint(localPos, { color, radius })
//         }
//     }
//     copyToRenderTarget() {

//     }
// }

// export class GroundRenderPatch extends RenderPatch<GroundPatchStub> {
//     ground: Ground
//     constructor(patchStub: GroundPatchStub, ground: Ground) {
//         super(patchStub);
//         this.ground = ground
//     }

//     renderToCanvas(): void {
//         const { patchStub, ground } = this
//         const patch = new GroundPatch(undefined, 0).fromStub(patchStub)
//         for (const block of patch.iterData()) {
//             const { localPos, data } = block
//             if (data) {
//                 const { level, biome, landIndex } = data
//                 const biomeLand = ground.biomes[biome].nth(landIndex).data
//                 const blockType = biomeLand.type as BlockType
//                 const blockColor = BLOCKS_COLOR_MAPPING[blockType]
//                 const rescaledLevel = Math.min(0.75 * level, 256)

//                 const color = "#" + blockColor.toString(16).padStart(6, '0');  //`rgb(${rescaledLevel}, ${rescaledLevel}, ${rescaledLevel})`
//                 const radius = 1
//                 this.drawPoint(localPos, { color, radius })
//             }
//         }
//     }
//     copyToRenderTarget(): void {
//         throw new Error("Method not implemented.");
//     }

// }

// export class SpawnRenderPatch {

// }

// export class PatchDiscreteDataContainer

// type SparsePatchDataStub<DataType> = EmptyPatchStub & {
//     data: DataType[]
// }

// export class SpawnSpotsImageDatasource extends PatchDataRenderer<SparseDataPatchStub<SpawnData>> {

//     constructor(sparsePatchData: SparseDataPatchStub<SpawnData>) {
//         super(sparsePatchData);
//     }

//     renderToCanvas(): void {
//         throw new Error("Method not implemented.");
//     }
//     copyToRenderTarget(): void {
//         throw new Error("Method not implemented.");
//     }

// }


// export interface PatchProvider {
//     patchDataIndex: Record<string, PatchDataStub>
// }