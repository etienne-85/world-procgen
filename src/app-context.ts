import Stats from 'three/examples/jsm/libs/stats.module.js';
import { Pane } from 'tweakpane';
import { WebGLRenderer } from 'three';

export class Collection {
    fields = {} as any
    add(fields: Object) {
        Object.assign(this.fields, fields)
    }
}

export const initThreeStats = (renderer: WebGLRenderer) => {
    const statsContainer = document.body.querySelector("#stats")

    if (statsContainer) {
        const statsFps = new Stats();
        statsContainer.appendChild(statsFps.dom);
        statsFps.dom.style.cssText = 'position:relative; cursor:pointer;margin:2px';

        // const statsDrawCalls = new Stats();
        // statsContainer.appendChild(statsDrawCalls.dom);
        // const statsDrawCallsPanel = new Stats.Panel('draw calls', '#ffffff', '#213547');
        // statsDrawCalls.addPanel(statsDrawCallsPanel);
        // statsDrawCalls.showPanel(3);
        // statsDrawCalls.dom.style.cssText = 'position:relative;cursor:pointer;margin:2px';

        // const statsTriangles = new Stats();
        // statsContainer.appendChild(statsTriangles.dom);
        // const statsTrianglesPanel = new Stats.Panel('triangles', '#ffffff', '#213547');
        // statsTriangles.addPanel(statsTrianglesPanel);
        // statsTriangles.showPanel(3);
        // statsTriangles.dom.style.cssText = 'position:relative;cursor:pointer;margin:2px';

        const updateThreeStats = (frameCount: number) => {
            // const rendererInfos = renderer.info;
            // if (frameCount % STATS_REFRESH_RATE === 0) {
            //     statsDrawCallsPanel.update(rendererInfos.render.calls, 200);
            //     statsTrianglesPanel.update(rendererInfos.render.triangles, 200);
            // }

            statsFps.update();
        }
        return { updateThreeStats }
    }
    const updateThreeStats = () => null
    return { updateThreeStats }
}


export const initGui = () => {
    const stats = Stats
    const pane = new Pane();
    return pane
}

export class AppContext {
    private static singleton: AppContext
    gui: Pane
    private _api = new Collection()
    private _state = new Collection()
    presets = new Collection()

    constructor() {
        const pane = new Pane()
        this.gui = pane
    }

    static get api() {
        return this.instance._api
    }
    static get state() {
        return this.instance._state
    }

    static get gui() {
        return this.instance.gui
    }

    static get instance() {
        this.singleton = this.singleton || new AppContext()
        return this.singleton
    }

    get api() {
        return this._api.fields
    }

    get state() {
        return this._state.fields
    }

    static install(container: any) {
        const { api, state, gui, presets } = this.instance
        container.appDevTools = { api, state, gui, presets }
    }
}

export const AppState = AppContext.instance.state
export const AppGui = AppContext.instance.gui
export const AppApi = AppContext.instance.api