/************************************************************************************** 
YTM Project:

    1) The user will be prompted to open the AR experience. 

    2) A loading screen with fun anicdotes (ex. Refuiling plane before takeoff) to load the models will appear. This loading screen could also show info about the experience 
    and where to find more information about it. 

    3) A reticle the size of the terrain wll appear on screen. The user will also be given instruction on how to use the experiences as an overlay on the screen. 

    4) Once the user determines where to place the terrain and taps the screen at the desired location, the terrain appears as a textured solid colour. 
    The starting town (Atlin or Carcross) will pop out of the terrain fully textured. The town will be vibrant which willl be in contrast with the texture surrounding it. 
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

// initializing variables
let container;
let camera, scene, renderer;
let controller; 
let gltf;
let loader;
let curve;
let listofPoints;
let model;
let line;
let smallerScene;
let spotLight;

let timeout;

init();
animate();

async function init() {

    container = document.createElement("div");
    document.body.appendChild(container);

    scene = new THREE.Scene();

    //creating a smaller scene that will move on path
    smallerScene = new THREE.Scene();
    scene.add(smallerScene);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

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

    // setting up light
    addLightToScene();

    // adding controller for hit testing
    controller = renderer.xr.getController(0);
    controller.addEventListener("select", onSelect);
    scene.add(controller);

    // loading the model
    loadModel();

    // initializing the curve
    createCurve();

    document.querySelector("#up").style.display = "block";

    document.querySelector("#up").addEventListener("mousedown", () => {
        timeout = setTimeout(moveUp, 100);
    });

    document.querySelector("#up").addEventListener("mouseup", () => {
        clearTimeout(timeout);
    });

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
function addSquareReticleToScene() {
    const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial();

    reticle = new THREE.Mesh(geometry, material);

    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
}

/*
  Function: loadModel
  Description: 
    Loads the model. 
    Ensures that each node casts a shadow
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
    model.scale.set(0.005, 0.005, 0.005);
    //model.rotation.y = Math.PI / 2;
    smallerScene.add(model)
}

/*
    Function: createCurve
    Description: 
        Creates a curve based on pointsOnCurve, a list of points. 
        Creates a line from the curve and adds it to the scene. 
    Parameters: None

    !IMPORTANT NOTE!
        Remove line from the scene before releasing the project to the public!
*/
function createCurve() {
    const pointsOnCurve = [

        // new THREE.Vector3(-0.57, -0.42, 1),
        // new THREE.Vector3(0.42, -0.42, 1),
        // new THREE.Vector3(0.91, -0.07, 0.23),
        // new THREE.Vector3(0.59, 0.69, 0.23),
        // new THREE.Vector3(-0.28, 0.91, 0.23),
        // new THREE.Vector3(-0.57, 0.26, -0.1),

        new THREE.Vector3(1, 0.4, -0.5),
        new THREE.Vector3(1, 0.6, 0.75),
        new THREE.Vector3(-0.3, 0.5, 1),
        new THREE.Vector3(-1, 0.2, -0.6),

    ];

    curve = new THREE.CatmullRomCurve3(pointsOnCurve);
    curve.closed = true;

    // making the curve visible in the scene
    listofPoints = curve.getPoints(1000);
    line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(listofPoints), new THREE.LineBasicMaterial({ color: 0xffffaa }));
    scene.add(line);
}

/****************************************Functions Called with onSelect*********************************************/

function onSelect() {

}

/********************************************Functions For Buttons*************************************************/

function moveUp() {
    new TWEEN.Tween(model.position).to({ z: model.position + 0.001 }, 500).start();
    timeout = setTimeout(moveUp, 100);
}

/******************************************************************************************************************/

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

let fraction = 0;


function render(timestamp, frame) {

    if (frame) {

        // getting the smaller scene to move along the curve and 
        fraction += 1;
        if (fraction > 999) fraction = 0;
        let point = listofPoints[fraction];
        smallerScene.position.copy(point);

        // getting the smaller scene to rotate towards the next point of the curve
        let nextPoint = listofPoints[fraction + 1];
        smallerScene.lookAt(nextPoint);

        TWEEN.update(); 
        renderer.render(scene, camera);
    }

}