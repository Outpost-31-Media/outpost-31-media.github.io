/************************************************************************************** 
YTM Project:

    1) The user will be prompted to open the AR experience. 

    2) A loading screen with fun anicdotes (ex. Refuiling plane before takeoff) to load the models will appear. This loading screen could also show info about the experience 
    and where to find more information about it. 

    3) A reticle the size of the terrain wll appear on screen. The user will also be given instruction on how to use the experiences as an overlay on the screen. 

    4) Once the user determines where to place the terrain and taps the screen at the desired location, the terrain appears as a textured solid colour. 
    The starting town (Atlin or Carcross) will pop out of the terrain fully textured. The town will be vibrant which will be in contrast with the texture surrounding it. 
    Some clouds will be floating over the town. 

    5) A button to start the experience appears. When clicked, the plane emerges from the clouds over the starting town. 
    The plane controls will also be displayed and the user will be able to manuver the plane.  

    6) The user flies the plane through the terrain towards the finishing town. As you fly over terrain, the tecture will change from the solid colour to the greyscale aerial photographs. 
    Along the way, the user will encounter various challenges (birds, wind, forest fires, storms) that they will have to manuver around. 
    Between the challanges, 3D text will grow out of the ground providing information about the BXF. We hope that this portion of the experience will take approximately 45 seconds. 

    7) Once the plane comes within a certain range of the finishing town, the plane controls will dissapear and the plane flies itself into a cloud floating over the finishing town. 

    8) A congratulations messenge will appear and a button to exit the AR experience. 

    9) The user will be taken to an ending splash page with relevant information about the plane, locations, etc. 

**************************************************************************************/

import { ARButton } from "https://unpkg.com/three@0.133.0/examples/jsm/webxr/ARButton.js";

// initilizing global variables
let container;
let camera, scene, renderer;
let smallerScene;
let controller;
let reticle;
let spotLight;
let timeout;

// initializing model global variables
let loader;
let model;
let gltf;
let gltfTerrain;
let terrain;
let mixer;
let movingAnimation;

let clock = new THREE.Clock();

// tp run mousedown/touchstart
let desktopTesting = true;

init();
animate();

async function init() {
    container = document.createElement("div");
    document.body.appendChild(container);

    scene = new THREE.Scene();
    smallerScene = new THREE.Scene();
    scene.add(smallerScene);

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.toneMappingWhitePoint = 1.0;
    renderer.physicallyCorrectLights = true;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // To run onSelect when a hit occurs 
    controller = renderer.xr.getController(0);
    controller.addEventListener("select", onSelect);
    scene.add(controller);
    addReticleToScene();

    // initializing the light in the scene
    addLightToScene();

    //loading the models
    loadTerrain();
    loadModel();

    // Add the AR button to the body of the DOM
    const button = ARButton.createButton(renderer, {
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: document.body },
        requiredFeatures: ["hit-test"],
    });
    document.body.appendChild(button);
    renderer.domElement.style.display = "none";

    button.addEventListener("click", () => {
        document.getElementById("welcome").style.display = 'none';
        document.getElementById("instructions").textContent = "Find an open area. Look around the room to calibrate the space. Tap your screen once a reticle appears on the ground to place the terrain."
    });

    // if start button is clicked, startAR function is called
    document.querySelector("#start").addEventListener("click", startAR);

    // runs if directional buttons are called
    if (desktopTesting) {
        document.querySelector("#up").addEventListener("mousedown", () => {
            timeout = setTimeout(moveUp, 100);
        });
        document.querySelector("#up").addEventListener("mouseup", () => {
            clearTimeout(timeout);
        });
        document.querySelector("#down").addEventListener("mousedown", () => {
            timeout = setTimeout(moveDown, 100);
        });
        document.querySelector("#down").addEventListener("mouseup", () => {
            clearTimeout(timeout);
        });
        document.querySelector("#right").addEventListener("mousedown", () => {
            timeout = setTimeout(moveRight, 100);
        });
        document.querySelector("#right").addEventListener("mouseup", () => {
            clearTimeout(timeout);
        });
        document.querySelector("#left").addEventListener("mousedown", () => {
            timeout = setTimeout(moveLeft, 100);
        });
        document.querySelector("#left").addEventListener("mouseup", () => {
            clearTimeout(timeout);
        });
    } else {
        document.querySelector("#up").addEventListener("touchstart", () => {
            timeout = setTimeout(moveUp, 100);
        });
        document.querySelector("#up").addEventListener("touchend", () => {
            clearTimeout(timeout);
        });
        document.querySelector("#down").addEventListener("touchstart", () => {
            timeout = setTimeout(moveDown, 100);
        });
        document.querySelector("#down").addEventListener("touchend", () => {
            clearTimeout(timeout);
        });
        document.querySelector("#right").addEventListener("touchstart", () => {
            timeout = setTimeout(moveRight, 100);
        });
        document.querySelector("#right").addEventListener("touchend", () => {
            clearTimeout(timeout);
        });
        document.querySelector("#left").addEventListener("touchstart", () => {
            timeout = setTimeout(moveLeft, 100);
        });
        document.querySelector("#left").addEventListener("touchend", () => {
            clearTimeout(timeout);
        });
    }

    window.addEventListener("resize", onWindowResize, false);
}

/***************************************Initializing Items In Scene*********************************************/

/*
  Function: addLightToScene
  Description: 
    Creates a hemisphere light and adds it to the scene. 
    Creates a spot light that casts shadows and adds it to the scene
  Parameters: None
*/
function addLightToScene() {

    // creating hemisphere light
    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, .7);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // creating a spotlight that casts shadows
    spotLight = new THREE.SpotLight(0xffa95c, 4);
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.0001;
    spotLight.shadow.mapSize.width = 1024 * 4;
    spotLight.shadow.mapSize.height = 1024 * 4;
    scene.add(spotLight);
}

/*
  Function addReticleToScene
  Description: 
    Creates a square reticle to represent the terrain. 
  Paramaters: None
*/
function addReticleToScene() {
    const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial();

    reticle = new THREE.Mesh(geometry, material);

    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
}

/*
  Function: loadTerrain
  Description: 
    Loads the model of the terrain. 
    Ensures that each node casts and recieves shadows. 
    Adds the model to the scene. 
    Loads the animation. 
  Parameters: None
*/
async function loadTerrain() {
    loader = new THREE.GLTFLoader();
    gltfTerrain = await loader.loadAsync("./gltf/testScene.glb");
    terrain = gltfTerrain.scene;
    terrain.traverse((node) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            if (node.material.map) node.material.map.anisotropy = 16;
        }
    });
    terrain.scale.set(3, 3, 3);
    terrain.position.set(0, -0.5, -1);
    terrain.visible = false;
    terrain.children[1].visible = false;
    scene.add(terrain);

    smallerScene.position.copy(terrain.children[1].position);

    mixer = new THREE.AnimationMixer(terrain);
    movingAnimation = mixer.clipAction(gltfTerrain.animations[0]);

    console.log(terrain); 

}

/*
  Function: loadModel
  Description: 
    Loads the model of the plane. 
    Ensures that each node casts and recieves shadows. 
    Adds the model to the embedded scene. 
  Parameters: None
*/
async function loadModel() {

    loader = new THREE.GLTFLoader();
    gltf = await loader.loadAsync("./gltf/a52.glb");
    model = gltf.scene;
    model.traverse((node) => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            if (node.material.map) node.material.map.anisotropy = 16;
        }
    });
    model.scale.set(0.01, 0.01, 0.01);
    model.visible = false;
    smallerScene.add(model);
}

/***************************************Functions Called with onSelect*******************************************/

/*
  Function: onSelect
  Description: 
    Runs when the screne is tapped. 
    If the model is visible, the terrain and the smallerScene will be moved to the location of the reticle.
    The terrain will become visible and a start button will appear overlayed on screen. 
  Parameters: None

*/
function onSelect() {
    if (reticle.visible) {

        terrain.position.setFromMatrixPosition(reticle.matrix);
        terrain.quaternion.setFromRotationMatrix(reticle.matrix);
        terrain.visible = true;

        smallerScene.position.setFromMatrixPosition(reticle.matrix);
        smallerScene.quaternion.setFromRotationMatrix(reticle.matrix);

        // start button become visible
        document.querySelector("#start").style.display = "block";

        // reticle is removed from the scene
        reticle.visible = false;
        scene.remove(reticle);
    }

}

/*********************************************Functions For Buttons*********************************************/

/*
    Function: startAR
    Description: 
        Called when the start button is clicked. 
        Makes the plane model visibles and begins to play the moving animation. 
        Makes the directional buttons visible. 
        Hides the start button. 
    Parameters: None
*/
function startAR() {

    model.visible = true;
    movingAnimation.play();

    // directional buttons become visible
    document.querySelector("#up").style.display = "block";
    document.querySelector("#down").style.display = "block";
    document.querySelector("#left").style.display = "block";
    document.querySelector("#right").style.display = "block";

    // hides the start button
    document.querySelector("#start").style.display = "None";

}

/*
    Function: moveUp
    Description: 
        Moves the plane model up by 0.01m
    Parameters: None
*/
function moveUp() {

    model.position.y += 0.01;
    //new TWEEN.Tween(model.position).to({y: model.position.y + 0.01}, 500).easing(TWEEN.Easing.Quadratic.InOut).start();
    timeout = setTimeout(moveUp, 100);
}

/*
    Function: moveUp
    Description: 
        Moves the plane model down by 0.01m
    Parameters: None
*/
function moveDown() {

}

/*
    Function: moveUp
    Description: 
        Moves the plane model right by 0.01m
    Parameters: None
*/
function moveRight() {

}

/*
    Function: moveUp
    Description: 
        Moves the plane model left by 0.01m
    Parameters: None
*/
function moveLeft() {
}

/**************************************************************************************************************/

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
let planeCreated = false;

async function initializeHitTestSource() {
    const session = renderer.xr.getSession();

    const viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({
        space: viewerSpace,
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

        if (!hitTestSourceInitialized) {
            initializeHitTestSource();
        }

        if (hitTestSourceInitialized) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);


            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];

                const pose = hit.getPose(localSpace);

                reticle.visible = true;

                reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                reticle.visible = false;
            }
        }

        if (model.visible) {

            // getting the position of the cube, unsure if simplifying it will effect the tweens
            let cubePos = new THREE.Vector3();
            cubePos.setFromMatrixPosition(terrain.children[1].matrixWorld);
            let cubePosCoords = { x: cubePos.x, y: cubePos.y, z: cubePos.z };

            // This line of code must be before the actual Tweens in the renderer
            TWEEN.update();

            // moving the model towards the cube
            new TWEEN.Tween(smallerScene.position).to(cubePosCoords, 10).easing(TWEEN.Easing.Quadratic.InOut).start();

            let time = { t: 0 };
            let start = smallerScene.quaternion.clone();
            smallerScene.lookAt(cubePos);
            let end = smallerScene.quaternion.clone();
            smallerScene.quaternion.copy(start);

            // turning the model towards the box
            new TWEEN.Tween(time).to({ t: 1 }, 100).onUpdate(() => {
                THREE.Quaternion.slerp(start, end, smallerScene.quaternion, time.t);
            }).easing(TWEEN.Easing.Quadratic.InOut).start();

            let deltaTime = clock.getDelta();

            // updating the animations
            if (mixer) {
                mixer.update(deltaTime);
            }
        }

        renderer.render(scene, camera);
    }
}

