import { BlocksTask, WorkerPool, WorldLocals, SpawnChunk, WorldModules, WorldTasksHandlers, createWorldModules } from "@aresrpg/aresrpg-world"
import { Box2, Vector2 } from "three"
import { ItemsTask } from "../../../aresrpg-world/src"
import { SpawnChunkStub } from "../../../aresrpg-world/dist/factory/ChunksFactory"

const setupTestEnv = async (worldEnv: WorldLocals) => {
    const testWorkerpool = new WorkerPool('tests')
    testWorkerpool.initPoolEnv(1, worldEnv)
    const worldProvider = await createWorldModules(worldEnv.toStub())
    return { testWorkerpool, worldProvider }
}

const testSpawnOverHolePruning = async (taskHandlers: WorldTasksHandlers) => {
    // setup hole
    const holeRadius = 10
    const holeCenter = new Vector2(450, -577)
    const holeDims = new Vector2(holeRadius, holeRadius)
    const holeArea = new Box2().setFromCenterAndSize(holeCenter, holeDims)
    // request schematics over hole
    const spawnTask = new ItemsTask().spawnedChunks(holeArea)
    spawnTask.processingParams.spawnInsideAreaOnly = true
    const spawnedChunks = spawnTask.process(taskHandlers) as SpawnChunk[]
    const blocksProvider = (input: any) => {
        const blocksTask = new BlocksTask().groundPositions(input)
        blocksTask.processingParams.includeDensity = true
        const blocksRes = blocksTask.process(taskHandlers)
        console.log(blocksRes)
        return blocksRes
    }
    spawnedChunks.forEach(spawnChunk => spawnChunk.retrieveBottomBlocks(blocksProvider))
    // build blocks batch
    //.delegate(workerPool)
}

export const runTests = async (worldEnv: WorldLocals) => {
    const { testWorkerpool, worldProvider } = await setupTestEnv(worldEnv)
    await testSpawnOverHolePruning(worldProvider.taskHandlers)
}