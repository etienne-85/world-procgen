import { getChunkId } from "@aresrpg/aresrpg-world";
import { AppContext, AppState } from "../app-context";
import { WorldLocals } from "../../../aresrpg-world/src";

const populatePOIpanel = () => {

}

export const initUIPanel = (worldEnv: WorldLocals) => {
    const playerPosElement = AppContext.gui.addBinding(AppState, 'playerPos', {
        label: "block",
        x: { readonly: false, format: (value) => Math.round(value) },
        y: { readonly: false, format: (value) => Math.round(value) },
        z: { readonly: false, format: (value) => Math.round(value) },
    });

    const patchCoordsElement = AppContext.gui.addBinding(AppState, 'patchCoords', {
        label: "patch",
        x: { readonly: false, format: (value) => Math.round(value) },
        y: { readonly: false, format: (value) => Math.round(value) },
        z: { readonly: false, format: (value) => Math.round(value) },
    });

    const restorePosBtn = AppContext.gui.addButton({ title: `restore pos` });
    restorePosBtn.on('click', () => AppState.playerPos.setY(150))

    const resetCamBtn = AppContext.gui.addButton({ title: `reset cam` });
    resetCamBtn.on('click', () => AppState.camTracking = true)
    // App.gui.addBinding(AppState, 'camTracking', {
    //     label: 'track',
    // })

    const updatePatchCoords = () => {
        const { playerPos, patchCoords } = AppState
        const chunkId = getChunkId(playerPos, worldEnv.getChunkDimensions())
        patchCoords.set(chunkId.x, chunkId.y, chunkId.z)
    }
    updatePatchCoords()

    const refreshUIPanel = () => {
        playerPosElement.refresh()
        updatePatchCoords()
        patchCoordsElement.refresh()
    }

    return { refreshUIPanel }
}