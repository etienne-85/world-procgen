import { Vector3 } from "three"

const state = { pos: new Vector3(0, 128, 0) }
const api = {} as any

export const world_dev_tools = {
    state,
    api
}

export const init_world_dev_tools = (context: any) => context.worldDevTools = world_dev_tools