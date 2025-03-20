import { BoardCacheProvider, BoardProvider, WorkerPool } from "@aresrpg/aresrpg-world"
import { Vector3 } from "three"
import { worldDemoEnv } from "./demo_setup"
import workerUrl from '@aresrpg/aresrpg-world/worker?url'
import { chunk_data_encoder } from "./world_demo"

export async function create_board(position = new Vector3()) {
    // seems the boardprocessor is made to have a single instance so we have to call that each time
    // and it will erase the previous instance
    const board_dedicated_worker_pool = new WorkerPool()
    board_dedicated_worker_pool.initPoolEnv(1, worldDemoEnv, workerUrl)
    const cache_prov = new BoardCacheProvider(board_dedicated_worker_pool, worldDemoEnv)
    const board_processor = new BoardProvider(
      position,
      cache_prov,
      chunk_data_encoder,
      worldDemoEnv
    )
  
    const board = await board_processor.genBoardContent()
    const board_chunks = board_processor.overrideOriginalChunksContent(
      board.chunk,
    )
    const original_chunks = board_processor.restoreOriginalChunksContent()
    const board_data = board.patch.toStub()
    board_data.elevation = board_processor.boardElevation

    console.log(board_data)
  
    // const board_handler = init_board_handler(board_data)
  
    // const board_size = board_data.bounds.getSize(new Vector2())
    // const border_blocks = FightBoards.extract_border_blocks(board_data)
    // const origin = asVect3(board_data.bounds.min, position.y)
    // const squares = Array.from(board_data.content).map(type => ({
    //   type, // dummy
    //   category: Math.max(0, type - 1),
    // }))
    // const sorted_border_blocks = FightBoards.sort_by_side(
    //   border_blocks,
    //   board_data,
    // )
    // const start_overlay = new BoardOverlaysHandler({
    //   board: {
    //     size: { x: board_size.x, z: board_size.y },
    //     origin,
    //   },
    // })
    // const edge_overlay = new BoardOverlaysHandler({
    //   board: {
    //     size: { x: board_size.x, z: board_size.y },
    //     origin,
    //   },
    // })
    // const to_local_pos = pos => ({
    //   x: pos.x - board_data.bounds.min.x,
    //   z: pos.y - board_data.bounds.min.y,
    // })
  
    // const board_items = FightBoards.iter_board_data(board_data)
    // const sorted_board_items = FightBoards.sort_by_side(board_items, board_data)
    // const { team_1, team_2 } = FightBoards.get_fight_start_positions({
    //   team_1_blocks: sorted_board_items.first,
    //   team_2_blocks: sorted_board_items.second,
    //   max_team_size: MAX_TEAM_SIZE,
    // })
  
    // const team_1_positions = team_1.map(block => to_local_pos(block.pos))
    // const team_2_positions = team_2.map(block => to_local_pos(block.pos))
  
    return {
      board_chunks,
      original_chunks,
    //   team_1_positions,
    //   team_2_positions,
    //   squares,
    //   show_start_positions() {
    //     board_handler.displaySquares(team_1_positions, new Color(0x1976d2))
    //     board_handler.displaySquares(team_2_positions, new Color(0xd32f2f))
    //     context.scene.add(board_handler.container)
    //   },
    //   hide_start_positions() {
    //     start_overlay.clearSquares()
    //     start_overlay.dispose()
    //     context.scene.remove(start_overlay.container)
    //   },
    //   show_edges() {
    //     const first_player_side = sorted_border_blocks.first.map(block =>
    //       to_local_pos(block.pos),
    //     )
    //     const second_player_side = sorted_border_blocks.second.map(block =>
    //       to_local_pos(block.pos),
    //     )
  
    //     edge_overlay.clearSquares()
    //     edge_overlay.displaySquares(first_player_side, new Color(0x212121))
    //     edge_overlay.displaySquares(second_player_side, new Color(0x212121))
    //     context.scene.add(edge_overlay.container)
    //   },
    //   hide_edges() {
    //     edge_overlay.clearSquares()
    //     edge_overlay.dispose()
    //     context.scene.remove(edge_overlay.container)
    //   },
    //   dispose(scene) {
    //     BoardProvider.deleteInstance()
    //     board_handler.dispose()
    //     scene.remove(board_handler.container)
    //   },
    }
  }