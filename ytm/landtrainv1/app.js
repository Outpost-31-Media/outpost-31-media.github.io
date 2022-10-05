import {
    ARButton
} from '../lib/ARButton.js';
// import { DRACOLoader } from './libs/DRACOLoader.js';


console.log('loading Three JS Version R' + THREE.REVISION);

let camera, scene, renderer;
let loader;
let reticle;
let controller;
let ship;
let mask;
let pane;
let loadingPane;
var object3D = null;
let arButton;
let rotDir = 0;
let placerReticle;
let spotLight;
let plane;

let xrSessionStarted = false;

let desktopTesting = false;
var url = document.location.href;
if (url.includes('localhost') || url.includes('127.0.0.1')) {
    desktopTesting = true;
}
console.log('desktop testing is ' + desktopTesting);

init();
animate();





function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.physicallyCorrectLights = true;


    container.appendChild(renderer.domElement);

    light
    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, .3);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    spotLight = new THREE.SpotLight(0xffa95c, 20);
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.0001;
    spotLight.shadow.mapSize.width = 1024 * 4;
    spotLight.shadow.mapSize.height = 1024 * 4;
    scene.add(spotLight);

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    addShadowPlaneToScene();


    document.querySelector("#ultra").addEventListener("click", () => {
        lodSelection(0);
    });

    document.querySelector("#high").addEventListener("click", () => {
        lodSelection(1);
    });
    document.querySelector("#low").addEventListener("click", () => {
        lodSelection(2);
    });
    document.querySelector("#left").addEventListener('beforexrselect', ev => ev.preventDefault());
    document.querySelector("#right").addEventListener('beforexrselect', ev => ev.preventDefault());


    if (!desktopTesting) {
        document.querySelector("#left").addEventListener("touchstart", () => {
            rotDir = -1;
        });
        document.querySelector("#left").addEventListener("touchend", () => {
            rotDir = 0;
        });
        document.querySelector("#right").addEventListener("touchstart", () => {
            rotDir = 1;
        });
        document.querySelector("#right").addEventListener("touchend", () => {
            rotDir = 0;
        });

    } else if (desktopTesting) {
        document.querySelector("#left").addEventListener("mousedown", () => {
            rotDir = -1;
        });
        document.querySelector("#left").addEventListener("mouseup", () => {
            rotDir = 0;
        });
        document.querySelector("#right").addEventListener("mousedown", () => {
            rotDir = 1;
        });
        document.querySelector("#right").addEventListener("mouseup", () => {
            rotDir = 0;
        });
    };
    // addReticleToScene();





    arButton = ARButton.createButton(renderer, {
        optionalFeatures: ["dom-overlay"],
        domOverlay: {
            root: document.body
        },
        requiredFeatures: ["hit-test"]
    });
    arButton.addEventListener("click", () => {
      if (!xrSessionStarted) {
        document.getElementById("welcome").style.display = 'none';
        xrSessionStarted = true;
      } else if (xrSessionStarted) {
        console.log('exit')
        location.href = './congrats.html';
      }
      
    });
    

    window.addEventListener('resize', onWindowResize, false);
}


function lodSelection(lod) {
    document.querySelector("#high").style.display = "none";
    document.querySelector("#low").style.display = "none";
    document.querySelector("#ultra").style.display = "none";

    loadModels(lod);
}

function addShadowPlaneToScene () {
  const geometry = new THREE.PlaneGeometry(1000, 1000);
  const material = new THREE.ShadowMaterial();
  // const material = new THREE.MeshBasicMaterial();
  material.opacity = 0.4;

  plane = new THREE.Mesh(geometry, material);
  plane.receiveShadow = true;
  plane.rotateX(-Math.PI / 2);
  // plane.matrixAutoUpdate = true;
  scene.add(plane);
}

async function loadModels(lod) {

    const models = ["./gltf/landtrainDesktop.glb", "./gltf/landtrainHigh.glb", "./gltf/landtrainLow.glb"];
    const reticleURLs = ["./gltf/reticleDesktop.glb","./gltf/reticle.glb","./gltf/reticle.glb"]

    // const loader = new THREE.GLTFLoader();
    const dracoLoader = new THREE.DRACOLoader();

    dracoLoader.setDecoderPath('../lib/draco/');

    const loader = new THREE.GLTFLoader()
    loader.setDRACOLoader(dracoLoader)
    const polyLevel = lod;
    const progressBar = document.getElementById("myBar");
    console.log(`prepping to load ${models[polyLevel]}`)
        // loader.setDRACOLoader(dracoLoader);

    // load the ship
    document.querySelector("#myBar").style.display = "block";
    document.querySelector("#myProgress").style.display = "block";
    loader.load(reticleURLs[polyLevel],
        function(gltf) {
            reticle = gltf.scene;
            // reticle.matrixAutoUpdate = false; //stops 3js from moving the reticle
            reticle.visible = false;
            if (polyLevel == 0) {
                reticle.scale.set(0.5, 0.5, 0.5);
            };
            scene.add(reticle);
        },
        function(xhr) {
            progressBar.style.width = (Math.round(xhr.loaded / xhr.total * 100)) + "%";
            progressBar.innerHTML = (Math.round(xhr.loaded / xhr.total * 100)) + "% 1/2";
            if ((xhr.loaded / xhr.total * 100) === 100) {


            }
        },
        // onError callback
        function(error) {
            console.error(error);
        }
    );


    loader.load(models[polyLevel],
        function(gltf) {
            gltf.scene.traverse(function(node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            ship = gltf.scene;
            ship.visible = false;
            if (polyLevel == 0) {
                ship.scale.set(0.5, 0.5, 0.5);
            };
            scene.add(ship);
        },
        function(xhr) {
            progressBar.style.width = (xhr.loaded / xhr.total * 100)+ "%";
            progressBar.innerHTML = (Math.round(xhr.loaded / xhr.total * 100)) + "% 2/2";
            if ((xhr.loaded / xhr.total * 100) === 100) {
                document.querySelector("#myBar").style.display = "none";
                document.querySelector("#myProgress").style.display = "none";
                document.body.appendChild(arButton);

            }
        },
        // onError callback
        function(error) {
            console.error(error);
        }
    );
    placerReticle = new THREE.Object3D();
    placerReticle.matrixAutoUpdate = false;
    scene.add(placerReticle);

}


function onSelect() {
    if (reticle.visible && ship && !spawned) {
        ship.visible = true;
        ship.position.setFromMatrixPosition(reticle.matrix);
        ship.quaternion.setFromRotationMatrix(reticle.matrix);
        plane.position.setFromMatrixPosition(reticle.matrix);
        spotLight.position.set( plane.position.x+5, 20, plane.position.y+5 );
        spotLight.lookAt(ship);
        spawned = true;
    }
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

    renderer.setAnimationLoop(render);
}

let hitTestSource = null;
let localSpace = null;
let hitTestSourceInitialized = false;
let spawned = false;


async function initializeHitTestSource() {
    const session = renderer.xr.getSession();
    const viewerSpace = await session.requestReferenceSpace("viewer"); //get viewer space basically orgin of the phone that always moves with phone
    hitTestSource = await session.requestHitTestSource({
        space: viewerSpace
    });
    localSpace = await session.requestReferenceSpace("local");
    hitTestSourceInitialized = true;


    session.addEventListener("end", () => {
        hitTestSourceInitialized = false;
        hitTestSource = null;
    });
}



function render(timestamp, frame) {
    if (frame) {
        if (!spawned) {
            if (!hitTestSourceInitialized) {
                initializeHitTestSource();
            }

            if (hitTestSourceInitialized) {
                const hitTestResults = frame.getHitTestResults(hitTestSource);
                //console.log(hitTestResults); 

                if (hitTestResults.length > 0) {
                    const hit = hitTestResults[0];

                    const pose = hit.getPose(localSpace);
                    reticle.visible = true;

                    placerReticle.matrix.fromArray(pose.transform.matrix);
                    reticle.position.setFromMatrixPosition(placerReticle.matrix);

                } else {
                    reticle.visible = false;
                }
            }
        } else {
            reticle.visible = false;
        }
        if (reticle.visible == true) {
            document.querySelector("#left").style.display = "block";
            document.querySelector("#right").style.display = "block";
            reticle.rotation.y += (rotDir * .05);
        } else {
            document.querySelector("#left").style.display = "none";
            document.querySelector("#right").style.display = "none";
        };
        renderer.render(scene, camera);
    }
}