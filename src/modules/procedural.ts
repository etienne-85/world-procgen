import {
    WorldLocals,
    BlocksDataFormat,
    BoardCacheProvider, BoardProvider,
    ChunksPolling, WorkerPool,
    asVect2, getPatchId,
    BlocksTask
} from '@aresrpg/aresrpg-world';
import { chunksWsClient } from '../../../aresrpg-world/test/utils/chunks_over_ws_client';
import { Vector2, Vector3 } from 'three';
import workerUrl from '@aresrpg/aresrpg-world/worker?url'

/**
* Polling chunks either from remote or local source
*/

export class ProceduralEngine {
    private static singleton: ProceduralEngine

    static instance() {
        this.singleton = this.singleton || new ProceduralEngine()
        // if (!this.singleton) {
        //     if (scene && camera) {
        //         this.singleton = new PhysicsDemo(scene, camera);
        //     }
        //     else {
        //         console.warn('no instance exists. need to provide arguments to create one first.')
        //     }
        // } else if (scene && camera) {
        //     console.warn('arguments detected, cannot create more than on instance.')
        // }
        return this.singleton; // Return the singleton instance
    }

    initLodWorkerPool() {

    }

    initChunksWorkerPool() {

    }

    requestLodData() {

    }

    pollChunks() {

    }
}

export const init_chunks_polling_service = (world_env: WorldLocals, on_remote_chunk) => {
    const patchViewRanges = {
        near: 2,
        far: 4
    }
    const chunksVerticalRange = world_env.rawSettings.chunks.verticalRange
    let is_remote_available = false
    const chunks_polling = new ChunksPolling(patchViewRanges, chunksVerticalRange)
    // skip compression for local gen
    chunks_polling.skipBlobCompression = true
    // create workerpool to produce chunks locally
    const chunks_workerpool = new WorkerPool('chunks_worker')
    const get_visible_chunk_ids = chunks_polling.getVisibleChunkIds
    // try using remote source first
    const WS_URL = 'ws://localhost:3000'
    const { requestChunkOverWs, wsInitState } = chunksWsClient(WS_URL, on_remote_chunk)

    wsInitState
        .then(() => {
            console.log(`chunks stream client service listening on ${WS_URL} `)
            is_remote_available = true
        })
        // fallback to using local source if failing
        .catch(() => {
            console.warn(
                `chunks stream client failed to start on ${WS_URL}, fallbacking to local gen `,
            )
            const workerProvider = () => new Worker(workerUrl, { type: "module", name: 'externalWorker' })
            // init workerpool to produce chunks locally
            chunks_workerpool.initPoolEnv(4, world_env, workerProvider).then(() => {
                console.log(`local chunks workerpool ready`)
            })
        })

    // this will look for chunks depending on current view state
    const poll_chunks = (current_pos: Vector3, view_dist: number) => {
        // make sure service is available either from remote or local source
        if (is_remote_available || chunks_workerpool.ready) {
            const patch_dims = world_env.getPatchDimensions() // WorldEnv.current.patchDimensions
            const view_pos = getPatchId(asVect2(current_pos), patch_dims)
            const view_range = getPatchId(new Vector2(view_dist), patch_dims).x
            const chunks_tasks = chunks_polling.pollChunks(view_pos, view_range)
            let pendingTasks = []
            if (is_remote_available) {
                const view_state = { viewPos: view_pos, viewRange: view_range }
                requestChunkOverWs(view_state)
            } else {
                pendingTasks = chunks_tasks?.map(task => task.delegate(chunks_workerpool))
            }
            return pendingTasks
        }
        return []
    }
    return { poll_chunks, get_visible_chunk_ids }
}

export const init_lod_blocks_provider = (world_demo_env: WorldLocals) => {
    const lod_dedicated_workerpool = new WorkerPool('lod_worker')
    lod_dedicated_workerpool.initPoolEnv(1, world_demo_env)

    // console.log(`pending tasks: ${lod_dedicated_workerpool.processingQueue.length}`)

    const cancelAllLodTasks = () => {
        const { processingQueue } = lod_dedicated_workerpool
        console.log(`cancelling ${processingQueue.length} tasks`)
        processingQueue.forEach(task => task.cancel())
    }

    const lod_blocks_provider = async (positions_batch: Float32Array) => {
        const blocks_request = new BlocksTask().peakPositions(positions_batch)
        blocks_request.processingParams.dataFormat = BlocksDataFormat.XZ_FloatArray
        // console.log(`pending tasks: ${lod_dedicated_workerpool.processingQueue.length}`)
        const batch_result = await blocks_request.delegate(lod_dedicated_workerpool)
        return batch_result
    }
    return { lod_blocks_provider, cancelAllLodTasks }
}

export const get_board_provider = (worldEnv: WorldLocals, chunksDataEncoder: any, boardPos: Vector3) => {
    const board_dedicated_worker_pool = new WorkerPool()
    board_dedicated_worker_pool.initPoolEnv(1, worldEnv)

    const buildBoard = async () => {
        const cache_prov = new BoardCacheProvider(board_dedicated_worker_pool, worldEnv)
        const board_processor = new BoardProvider(
            boardPos,
            cache_prov,
            chunksDataEncoder,
            worldEnv
        )

        const board = await board_processor.genBoardContent()

        const boardChunks = board_processor.overrideOriginalChunksContent(board.chunk)
        const originalChunks = board_processor.restoreOriginalChunksContent()
        const boardData = board.patch.toStub()
        boardData.elevation = board_processor.boardElevation

        return { boardData, boardChunks, originalChunks }
    }
    return buildBoard
}


// async function board_chunks_provider(position = new Vector3(), board_dedicated_worker_pool) {
//     const cache_prov = new BoardCacheProvider(board_dedicated_worker_pool, worldDemoEnv)
//     const board_processor = new BoardProvider(
//         position,
//         cache_prov,
//         chunk_data_encoder,
//         worldDemoEnv
//     )

//     const board = await board_processor.genBoardContent()
//     const board_chunks = board_processor.overrideOriginalChunksContent(
//         board.chunk,
//     )
//     const original_chunks = board_processor.restoreOriginalChunksContent()
//     const board_data = board.patch.toStub()
//     board_data.elevation = board_processor.boardElevation

//     console.log(board_data)

//     // const board_handler = init_board_handler(board_data)

//     // const board_size = board_data.bounds.getSize(new Vector2())
//     // const border_blocks = FightBoards.extract_border_blocks(board_data)
//     // const origin = asVect3(board_data.bounds.min, position.y)
//     // const squares = Array.from(board_data.content).map(type => ({
//     //   type, // dummy
//     //   category: Math.max(0, type - 1),
//     // }))
//     // const sorted_border_blocks = FightBoards.sort_by_side(
//     //   border_blocks,
//     //   board_data,
//     // )
//     // const start_overlay = new BoardOverlaysHandler({
//     //   board: {
//     //     size: { x: board_size.x, z: board_size.y },
//     //     origin,
//     //   },
//     // })
//     // const edge_overlay = new BoardOverlaysHandler({
//     //   board: {
//     //     size: { x: board_size.x, z: board_size.y },
//     //     origin,
//     //   },
//     // })
//     // const to_local_pos = pos => ({
//     //   x: pos.x - board_data.bounds.min.x,
//     //   z: pos.y - board_data.bounds.min.y,
//     // })

//     // const board_items = FightBoards.iter_board_data(board_data)
//     // const sorted_board_items = FightBoards.sort_by_side(board_items, board_data)
//     // const { team_1, team_2 } = FightBoards.get_fight_start_positions({
//     //   team_1_blocks: sorted_board_items.first,
//     //   team_2_blocks: sorted_board_items.second,
//     //   max_team_size: MAX_TEAM_SIZE,
//     // })

//     // const team_1_positions = team_1.map(block => to_local_pos(block.pos))
//     // const team_2_positions = team_2.map(block => to_local_pos(block.pos))

//     return {
//         board_chunks,
//         original_chunks,
//         //   team_1_positions,
//         //   team_2_positions,
//         //   squares,
//         //   show_start_positions() {
//         //     board_handler.displaySquares(team_1_positions, new Color(0x1976d2))
//         //     board_handler.displaySquares(team_2_positions, new Color(0xd32f2f))
//         //     context.scene.add(board_handler.container)
//         //   },
//         //   hide_start_positions() {
//         //     start_overlay.clearSquares()
//         //     start_overlay.dispose()
//         //     context.scene.remove(start_overlay.container)
//         //   },
//         //   show_edges() {
//         //     const first_player_side = sorted_border_blocks.first.map(block =>
//         //       to_local_pos(block.pos),
//         //     )
//         //     const second_player_side = sorted_border_blocks.second.map(block =>
//         //       to_local_pos(block.pos),
//         //     )

//         //     edge_overlay.clearSquares()
//         //     edge_overlay.displaySquares(first_player_side, new Color(0x212121))
//         //     edge_overlay.displaySquares(second_player_side, new Color(0x212121))
//         //     context.scene.add(edge_overlay.container)
//         //   },
//         //   hide_edges() {
//         //     edge_overlay.clearSquares()
//         //     edge_overlay.dispose()
//         //     context.scene.remove(edge_overlay.container)
//         //   },
//         //   dispose(scene) {
//         //     BoardProvider.deleteInstance()
//         //     board_handler.dispose()
//         //     scene.remove(board_handler.container)
//         //   },
//     }
// }

// const show_board = async () => {
//     const { board_chunks } = await window.world_dev_tools.api.create_board(window.world_dev_tools.state.pos);
//     window.world_dev_tools.api.render_board_chunks(board_chunks)
//     console.log(board_chunks)
// }