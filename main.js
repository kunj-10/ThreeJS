import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Setup Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
scene.fog = new THREE.Fog(0x1a1a1a, 200, 1000);

// Setup Camera
const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    2000
);
camera.position.set(100, 150, 300);

// Setup lights
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
hemiLight.position.set(0, 200, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(0, 200, 100);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 180;
dirLight.shadow.camera.bottom = -100;
dirLight.shadow.camera.left = -120;
dirLight.shadow.camera.right = 120;
scene.add(dirLight);

// Ground
const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshPhongMaterial({ color: 0x111111, depthWrite: false })
);
mesh.rotation.x = -Math.PI / 2;
mesh.receiveShadow = true;
scene.add(mesh);

const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
grid.material.opacity = 0.2;
grid.material.transparent = true;
scene.add(grid);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('app').appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 50, 0);
controls.update();

// Load Model
const loader = new GLTFLoader();
const loadingOverlay = document.getElementById('loading-overlay');

loader.load(
    '/character.glb',
    (gltf) => {
        const object = gltf.scene;
        // Model loaded
        // Calculate bounding box to center and scale
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Center model
        object.position.x += (object.position.x - center.x);
        object.position.y += (object.position.y - center.y); // Adjust height if needed
        object.position.z += (object.position.z - center.z);

        // If model is very small or very large, normalize scale roughly
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 500 || maxDim < 10) {
            const scaleFactor = 150 / maxDim;
            object.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }

        // Place on ground
        // Re-calculate box after scale
        const box2 = new THREE.Box3().setFromObject(object);
        const minY = box2.min.y;
        object.position.y -= minY;

        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(object);

        // Initial mixer setup if animations exist
        if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(object);
            const action = mixer.clipAction(gltf.animations[0]);
            action.play();

            // Add mixer to an update array if needed, for simplicity we just render here
            // But we need a clock for animations
            const clock = new THREE.Clock();

            const animateWithMixer = () => {
                requestAnimationFrame(animateWithMixer);
                const delta = clock.getDelta();
                if (mixer) mixer.update(delta);
                renderer.render(scene, camera);
            };
            // Override the default animate loop
            animate = animateWithMixer;
            animate();
        }

        // Hide loader
        loadingOverlay.classList.add('hidden');
    },
    (xhr) => {
        // Progress
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.error(error);
        loadingOverlay.innerHTML = '<p style="color:red">Error loading model</p>';
    }
);

// Window resize
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
let animate = function () {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
};

animate();
