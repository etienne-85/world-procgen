import { DirectionalLight, AmbientLight, PCFSoftShadowMap, Scene, PerspectiveCamera, WebGLRenderer } from "three";
// import { OrbitControls } from "three/examples/jsm/Addons.js";
const DARK = 0x1c1c1c
const WHITE = 0xffffff
const DIR_LIGHT = WHITE  // 1c1c1c
const AMB_LIGHT = WHITE
const CLEAR_COLOR = WHITE

const setup_lights = (renderer, scene: Scene) => {
    const enableShadows = true
    const dirLight = new DirectionalLight(DIR_LIGHT, 1);
    dirLight.name = 'dirlight';
    dirLight.target.position.set(0, 0, 0);
    dirLight.position.set(100, 50, 100);
    dirLight.intensity = 1
    scene.add(dirLight);
    // this.gui.add(dirLight, 'intensity', 0, 3).name('Directional light');

    const ambientLight = new AmbientLight(AMB_LIGHT);
    ambientLight.name = 'ambient-light';
    scene.add(ambientLight);
    // this.gui.add(ambientLight, 'intensity', 0, 3).name('Ambient light');

    if (enableShadows) {
        // const planeReceivingShadows = new Mesh(new PlaneGeometry(200, 200), new MeshPhongMaterial());
        // planeReceivingShadows.name = 'shadows-plane';
        // planeReceivingShadows.position.set(0, -20, 0);
        // planeReceivingShadows.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI / 4);
        // planeReceivingShadows.rotateOnAxis(new Vector3(0, 1, 0), Math.PI / 4);
        // planeReceivingShadows.receiveShadow = true;
        // scene.add(planeReceivingShadows);

        // const sphereCastingShadows = new THREE.Mesh(new THREE.SphereGeometry(10), new THREE.MeshPhongMaterial());
        // sphereCastingShadows.position.set(20, 30, 20);
        // sphereCastingShadows.castShadow = true;
        // scene.add(sphereCastingShadows);

        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 200;
        dirLight.shadow.camera.bottom = -200;
        dirLight.shadow.camera.left = -200;
        dirLight.shadow.camera.right = 200;

        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = PCFSoftShadowMap;
    }
}

export const init_graphics = () => {
    const container = document.querySelector<HTMLDivElement>('#app')
    const renderer = new WebGLRenderer();
    container!.appendChild(renderer.domElement);
    renderer.setClearColor(CLEAR_COLOR);
    // renderer.setPixelRatio(window.devicePixelRatio)
    const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    const udpateRendererSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', udpateRendererSize);
    udpateRendererSize();
  
    camera.position.set(0, 210, 10);
    // const cameraControl = new OrbitControls(camera, renderer.domElement);
    // cameraControl.target.set(0, camera.position.y - 10, 0);
  
    const scene = new Scene();
    scene.name = 'test-scene';

    setup_lights(renderer, scene)
    // scene.matrixAutoUpdate = false;
    // scene.add(new THREE.AxesHelper(500));
    return { scene, camera, renderer }
  }
