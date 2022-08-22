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

let container;
let camera, scene, renderer;
let reticle;
let controller;
let gltf; 
let loader; 
let modelBee; 
let fraction = 0;
let char; 
let curve; 
let model; 
let tangent; 
let axisX; 
let qu; 
let axisXneg; 

let smallerScene; 

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
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    axisX = new THREE.Vector3(1, 0, 0);
    axisXneg = new THREE.Vector3(-1, 0, 0);
    qu = new THREE.Quaternion();

    const somePoints = [

        new THREE.Vector3(1, 0.4, -0.5),
        new THREE.Vector3(1, 0.6, 0.75),
        new THREE.Vector3(-0.8, 0.75, 1),
        new THREE.Vector3(-1, 0.2, -0.6),

    ];

    curve = new THREE.CatmullRomCurve3(somePoints);
    curve.closed = true;

    const points = curve.getPoints(60);
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xffffaa }));
    scene.add(line);

    loader = new THREE.GLTFLoader();
    gltf = await loader.loadAsync("./gltf/a52.glb");
    model = gltf.scene;
    model.scale.set(0.005, 0.005, 0.005); 
    model.rotation.y = Math.PI/2; 
    smallerScene.add(model)


    const button = ARButton.createButton(renderer, {
    });
    document.body.appendChild(button);
    renderer.domElement.style.display = "none";

    window.addEventListener("resize", onWindowResize, false);
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
    if (frame) {

        fraction += 0.0001;
        if (fraction > 1) fraction = 0;

        smallerScene.position.copy(curve.getPoint(fraction));

        tangent = curve.getTangent(fraction);

        if (tangent.x < 0) {

            qu.setFromUnitVectors(axisXneg, tangent);
            qu.invert();
            smallerScene.quaternion.copy(qu);

        } else {

            smallerScene.quaternion.setFromUnitVectors(axisX, tangent);

        }

        renderer.render(scene, camera);
    }
}


