import { Vector3 } from "three"
import { create_board } from "./board_tools"

const state = { pos: new Vector3(0, 128, 0) }
const api = {create_board}

export const world_dev_tools = {
    state,
    api
}

window.world_dev_tools = world_dev_tools