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
let positionOnLine = 0;
let char;
let curve;
let points; 
let model;
let tangent;
let axisX;
let line;
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

    loader = new THREE.GLTFLoader();
    gltf = await loader.loadAsync("./gltf/a52.glb");
    model = gltf.scene;
    model.scale.set(0.005, 0.005, 0.005);
    //model.rotation.y = Math.PI / 2;
    smallerScene.add(model)

    axisX = new THREE.Vector3(1, 0, 0);
    axisXneg = new THREE.Vector3(-1, 0, 0);
    qu = new THREE.Quaternion();

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

    points = curve.getPoints(1000);
    line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xffffaa }));
    scene.add(line);


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

let fraction = 0;


function render(timestamp, frame) {

    if (frame) {

        let newPosition = curve.getPoints(1000); 


        fraction += 1;
        if (fraction > 999) fraction = 0;
        //const newPosition = curve.getPoints(60);
        let point = newPosition[fraction];

        smallerScene.position.copy(point); 

        let nextPoint = newPosition[fraction + 1]; 

        let time = { t: 0 };
        let start = smallerScene.quaternion.clone();
        smallerScene.lookAt(nextPoint);
        // let end = smallerScene.quaternion.clone();
        // smallerScene.quaternion.copy(start);

        // // turning the model towards the reticle with Tween.js
        // new TWEEN.Tween(time).to({ t: 1 }, 1).onUpdate(() => {
        //     THREE.Quaternion.slerp(start, end, smallerScene.quaternion, time.t);
        // }).easing(TWEEN.Easing.Quadratic.InOut).start();

        // TWEEN.update(); 


        // TWEEN.update(); 

        // fraction += 0.001;
        // if (fraction > 1) fraction = 0;
        // var point = curve.getPoint(fraction);
        // var rotation = curve.getTangent(fraction);

        // smallerScene.position.x = point.x;
        // smallerScene.position.y = point.y;
        // smallerScene.position.z = point.z;

        // let nextPoint = curve.getPoint(fraction + 0.001); 

        // let time = { t: 0 };
        // let start = smallerScene.quaternion.clone();
        // smallerScene.lookAt(nextPoint);
        // let end = smallerScene.quaternion.clone();
        // smallerScene.quaternion.copy(start);

        // // turning the model towards the reticle with Tween.js
        // new TWEEN.Tween(time).to({ t: 1 }, 1).onUpdate(() => {
        //   THREE.Quaternion.slerp(start, end, smallerScene.quaternion, time.t);
        // }).easing(TWEEN.Easing.Quadratic.InOut).start();


        // //smallerScene.lookAt(curve.getPoint(fraction + 0.001));
        // let fraction = 0; 

        // const newPosition = curve.getPoint(fraction);
        // const tangent = curve.getTangent(fraction);
        // smallerScene.position.copy(newPosition);
        // axis.crossVectors( up, tangent ).normalize();

        // const radians = Math.acos( up.dot( tangent ) );

        // smallerScene.quaternion.setFromAxisAngle( axis, radians );

        renderer.render(scene, camera);



    }

}