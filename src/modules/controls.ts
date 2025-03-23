import * as THREE from 'three';
import { PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
import CameraControls from 'camera-controls';
import { CAMERA_MAX_DISTANCE, CAMERA_MIN_DISTANCE } from '../demo_settings';

CameraControls.install({ THREE: THREE });

export const init_controls = (camera: PerspectiveCamera, renderer: WebGLRenderer) => {
    const camera_controls = new CameraControls(camera, renderer.domElement)

    camera_controls.dollyDragInverted = true
    camera_controls.dollyToCursor = true
    camera_controls.maxDistance = CAMERA_MAX_DISTANCE
    camera_controls.minDistance = CAMERA_MIN_DISTANCE
    camera_controls.smoothTime = 0.1
    camera_controls.dollyTo(8)
    camera_controls.rotate(0, 1)

    // let is_dragging = false

    // const set_distance = distance => {
    //     distance = clamp(distance, CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE)
    //     distance = Math.round(distance)
    //     camera_controls.dollyTo(distance, true)
    // }

    // const on_mouse_down = () => {
    //     if (context.get_state().current_fight || is_hovering_mob_group()) return
    //     // is_dragging = true
    //     renderer.domElement.requestPointerLock()
    // }

    // const on_mouse_wheel = event => {
    //     const delta_abs = Math.max(
    //         CAMERA_DISTANCE_STEP,
    //         0.35 * camera_controls.distance,
    //     )
    //     const delta = delta_abs * Math.sign(event.deltaY)
    //     set_distance(camera_controls.distance + delta)
    // }

    // renderer.domElement.addEventListener('mousedown', on_mouse_down, {
    //     signal,
    // })

    // const set_free_cam = () => {
    //     camera_controls.colliderMeshes = []
    //     camera_controls.maxDistance = 1000
    //     camera_controls.minDistance = 0
    //     renderer.domElement.removeEventListener(
    //         'mousedown',
    //         on_mouse_down,
    //     )
    //     renderer.domElement.removeEventListener('wheel', on_mouse_wheel)
    //     // @ts-ignore
    //     camera_controls.mouseButtons.right = CameraControls.ACTION.TRUCK
    //     // @ts-ignore
    //     camera_controls.mouseButtons.wheel = CameraControls.ACTION.DOLLY
    // }

    // const set_follow_cam = () => {
    //     camera_controls.maxDistance = CAMERA_MAX_DISTANCE
    //     camera_controls.minDistance = CAMERA_MIN_DISTANCE
    //     renderer.domElement.addEventListener('mousedown', on_mouse_down, {
    //         signal,
    //     })
    //     renderer.domElement.addEventListener('wheel', on_mouse_wheel, {
    //         signal,
    //     })
    //     set_distance(camera_controls.distance)
    //     // @ts-ignore
    //     camera_controls.mouseButtons.right = CameraControls.ACTION.ROTATE
    //     // @ts-ignore
    //     camera_controls.mouseButtons.wheel = CameraControls.ACTION.NONE
    // }

    const follow_player = (player_pos: Vector3, delta: number, player_height = 0) => {
        const { x, y, z } = player_pos

        // Set the perspective camera position to follow the player
        camera_controls.moveTo(x, y + player_height, z, true)
        camera_controls.setTarget(x, y + player_height, z, true)

        camera_controls.update(delta)
        // player.object3d.visible = camera_controls.distance > 0.75
    }

    return follow_player
}