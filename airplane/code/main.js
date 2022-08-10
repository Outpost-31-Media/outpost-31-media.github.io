/************************************************************************************** 
Sam's Challenge: 
- hit test to place landing strip 
- throttle to be a gui that can be increased and decreased 
- pitch, roll and yaw 
    - will work with up, down, left, right arrows
    - quaternion or tween will move the object in the correct direction
    - move plane in direction the object is pointing
- plane will move forwards if button is not being selected or a button to move plane forwards

*****NOTE*****
- See forestFire for updated controls of plane and box collisions!!!!
**************************************************************************************/

import { ARButton } from 'https://unpkg.com/three@0.133.0/examples/jsm/webxr/ARButton.js';
 
// Initializing Variables
let camera, scene, renderer;
let model;
let controller; 
let reticle; 
let loader;
let gltf; 
let plane; 
let timeout; 
let mixer; 
const clock = new THREE.Clock();

// Bounding boxes Variables
let  modelBB, wallBBFront, wallBBLeft, wallBBRight, wallBBGround, wallBBCeiling, wallBBBack;

// Gui Variables
let speed = 0.1*0.001;
let pane;  
const guiPARAM = {
  throttle: 0.1
}
let desktopTesting = true;

init(); 
animate(); 



async function init() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true; 
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
  renderer.xr.enabled = true; 
  container.appendChild(renderer.domElement);

  addLightToScene(); 
  addShadowPlaneToScene(); 

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  // adding the reticle to the scene
  addReticleToScene();

  // loading the model 
  await loadModel(); 
  mixer = new THREE.AnimationMixer(model);
  let propellerLeft =  mixer.clipAction(gltf.animations[12]); 
  let propellerRight =  mixer.clipAction(gltf.animations[13]); 
  propellerLeft.play(); 
  propellerRight.play(); 

  // adding the bounding boxes to the scene
  addBoundingBoxesToModels();  

  // Add the AR button to the body of the DOM
  const arButton = ARButton.createButton(renderer, {
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body },
    requiredFeatures: ["hit-test"],
  });
  document.body.appendChild(arButton);
  renderer.domElement.style.display = "none";

  arButton.addEventListener("click", () => {
    document.getElementById("instructions").style.color = "white"; 
    document.getElementById("instructions").textContent= "Find an open area. Tap your screen once a reticle appears on the ground."
  });

  setupGui();

  // handler if throttle is changed
  pane.on('change', (ev) => {
    const value = ev.value;
    speed = value * 0.004;
  });

  if (desktopTesting === true) {
    // handlers if directional buttons are pushed
    document.querySelector("#up").addEventListener("mousedown", () => {
      timeout = setTimeout(moveUp, 100);

      let backRightDown = mixer.clipAction(gltf.animations[14]);
      backRightDown.clampWhenFinished = true;
      backRightDown.timeScale = 4;
      backRightDown.setLoop(THREE.LoopOnce);
      backRightDown.play();

      let backLeftDown = mixer.clipAction(gltf.animations[18]);
      backLeftDown.clampWhenFinished = true;
      backLeftDown.timeScale = 4;
      backLeftDown.setLoop(THREE.LoopOnce);
      backLeftDown.play();

    });
    document.querySelector("#down").addEventListener("mousedown", () => {
      timeout = setTimeout(moveDown, 100);

      let backRightUp = mixer.clipAction(gltf.animations[16]);
      backRightUp.clampWhenFinished = true;
      backRightUp.timeScale = 4;
      backRightUp.setLoop(THREE.LoopOnce);
      backRightUp.play();

      let backLeftUp = mixer.clipAction(gltf.animations[20]);
      backLeftUp.clampWhenFinished = true;
      backLeftUp.timeScale = 4;
      backLeftUp.setLoop(THREE.LoopOnce);
      backLeftUp.play();

    });
    document.querySelector("#left").addEventListener("mousedown", () => {
      timeout = setTimeout(moveLeft, 100);

      let frontRightUp = mixer.clipAction(gltf.animations[2]);
      frontRightUp.clampWhenFinished = true;
      frontRightUp.timeScale = 4;
      frontRightUp.setLoop(THREE.LoopOnce);
      frontRightUp.play();

      let frontLeftDown = mixer.clipAction(gltf.animations[4]);
      frontLeftDown.clampWhenFinished = true;
      frontLeftDown.timeScale = 4;
      frontLeftDown.setLoop(THREE.LoopOnce);
      frontLeftDown.play();

      let backWingLeft = mixer.clipAction(gltf.animations[8]);
      backWingLeft.clampWhenFinished = true;
      backWingLeft.timeScale = 4;
      backWingLeft.setLoop(THREE.LoopOnce);
      backWingLeft.play();

    });
    document.querySelector("#right").addEventListener("mousedown", () => {
      timeout = setTimeout(moveRight, 100);

      let frontRightDown = mixer.clipAction(gltf.animations[0]);
      frontRightDown.clampWhenFinished = true;
      frontRightDown.timeScale = 4;
      frontRightDown.setLoop(THREE.LoopOnce);
      frontRightDown.play();

      let frontLeftUp = mixer.clipAction(gltf.animations[6]);
      frontLeftUp.clampWhenFinished = true;
      frontLeftUp.timeScale = 4;
      frontLeftUp.setLoop(THREE.LoopOnce);
      frontLeftUp.play();

      let backWingRight = mixer.clipAction(gltf.animations[10]);
      backWingRight.clampWhenFinished = true;
      backWingRight.timeScale = 4;
      backWingRight.setLoop(THREE.LoopOnce);
      backWingRight.play();
    });

    // handlers if directional buttons are released
    document.querySelector("#up").addEventListener("mouseup", () => {
      clearTimeout(timeout);
      straightenUp();

      let backRightDownReturn = mixer.clipAction(gltf.animations[15]);
      backRightDownReturn.clampWhenFinished = true;
      backRightDownReturn.timeScale = 4;
      backRightDownReturn.setLoop(THREE.LoopOnce);
      backRightDownReturn.play();

      let backLeftDownReturn = mixer.clipAction(gltf.animations[19]);
      backLeftDownReturn.clampWhenFinished = true;
      backLeftDownReturn.timeScale = 4;
      backLeftDownReturn.setLoop(THREE.LoopOnce);
      backLeftDownReturn.play();
    });
    document.querySelector("#down").addEventListener("mouseup", () => {
      clearTimeout(timeout);
      straightenDown();

      let backRightUpReturn = mixer.clipAction(gltf.animations[17]);
      backRightUpReturn.clampWhenFinished = true;
      backRightUpReturn.timeScale = 4;
      backRightUpReturn.setLoop(THREE.LoopOnce);
      backRightUpReturn.play();

      let backLeftUpReturn = mixer.clipAction(gltf.animations[21]);
      backLeftUpReturn.clampWhenFinished = true;
      backLeftUpReturn.timeScale = 4;
      backLeftUpReturn.setLoop(THREE.LoopOnce);
      backLeftUpReturn.play();
    });
    document.querySelector("#left").addEventListener("mouseup", () => {
      clearTimeout(timeout);
      straightenLeft();

      let frontRightUpReturn = mixer.clipAction(gltf.animations[3]);
      frontRightUpReturn.clampWhenFinished = true;
      frontRightUpReturn.timeScale = 4;
      frontRightUpReturn.setLoop(THREE.LoopOnce);
      frontRightUpReturn.play();

      let frontLeftDownReturn = mixer.clipAction(gltf.animations[5]);
      frontLeftDownReturn.clampWhenFinished = true;
      frontLeftDownReturn.timeScale = 4;
      frontLeftDownReturn.setLoop(THREE.LoopOnce);
      frontLeftDownReturn.play();

      let backWingLeftReturn = mixer.clipAction(gltf.animations[9]);
      backWingLeftReturn.clampWhenFinished = true;
      backWingLeftReturn.timeScale = 4;
      backWingLeftReturn.setLoop(THREE.LoopOnce);
      backWingLeftReturn.play();

    });
    document.querySelector("#right").addEventListener("mouseup", () => {
      clearTimeout(timeout);
      straightenRight();

      let frontRightDownReturn = mixer.clipAction(gltf.animations[1]);
      frontRightDownReturn.clampWhenFinished = true;
      frontRightDownReturn.timeScale = 4;
      frontRightDownReturn.setLoop(THREE.LoopOnce);
      frontRightDownReturn.play();

      let frontLeftUpReturn = mixer.clipAction(gltf.animations[7]);
      frontLeftUpReturn.clampWhenFinished = true;
      frontLeftUpReturn.timeScale = 4;
      frontLeftUpReturn.setLoop(THREE.LoopOnce);
      frontLeftUpReturn.play();

      let backWingRightReturn = mixer.clipAction(gltf.animations[11]);
      backWingRightReturn.clampWhenFinished = true;
      backWingRightReturn.timeScale = 4;
      backWingRightReturn.setLoop(THREE.LoopOnce);
      backWingRightReturn.play();
    });
  } else {
    // handlers if directional buttons are pushed
    document.querySelector("#up").addEventListener("touchstart", () => {
      timeout = setTimeout(moveUp, 100);

      let backRightDown = mixer.clipAction(gltf.animations[14]);
      backRightDown.clampWhenFinished = true;
      backRightDown.timeScale = 4;
      backRightDown.setLoop(THREE.LoopOnce);
      backRightDown.play();

      let backLeftDown = mixer.clipAction(gltf.animations[18]);
      backLeftDown.clampWhenFinished = true;
      backLeftDown.timeScale = 4;
      backLeftDown.setLoop(THREE.LoopOnce);
      backLeftDown.play();
    });
    document.querySelector("#down").addEventListener("touchstart", () => {
      timeout = setTimeout(moveDown, 100);

      let backRightUp = mixer.clipAction(gltf.animations[16]);
      backRightUp.clampWhenFinished = true;
      backRightUp.timeScale = 4;
      backRightUpn.setLoop(THREE.LoopOnce);
      backRightUp.play();

      let backLeftUp = mixer.clipAction(gltf.animations[20]);
      backLeftUp.clampWhenFinished = true;
      backLeftUp.timeScale = 4;
      backLeftUp.setLoop(THREE.LoopOnce);
      backLeftUp.play();
    });
    document.querySelector("#left").addEventListener("touchstart", () => {
      timeout = setTimeout(moveLeft, 100);

      let frontRightUp = mixer.clipAction(gltf.animations[2]);
      frontRightUp.clampWhenFinished = true;
      frontRightUp.timeScale = 4;
      frontRightUp.setLoop(THREE.LoopOnce);
      frontRightUp.play();

      let frontLeftDown = mixer.clipAction(gltf.animations[4]);
      frontLeftDown.clampWhenFinished = true;
      frontLeftDown.timeScale = 4;
      frontLeftDown.setLoop(THREE.LoopOnce);
      frontLeftDown.play();

      let backWingLeft = mixer.clipAction(gltf.animations[8]);
      backWingLeft.clampWhenFinished = true;
      backWingLeft.timeScale = 4;
      backWingLeft.setLoop(THREE.LoopOnce);
      backWingLeft.play();
    });
    document.querySelector("#right").addEventListener("touchstart", () => {
      timeout = setTimeout(moveRight, 100);

      let frontRightDown = mixer.clipAction(gltf.animations[0]);
      frontRightDown.clampWhenFinished = true;
      frontRightDown.timeScale = 4;
      frontRightDown.setLoop(THREE.LoopOnce);
      frontRightDown.play();

      let frontLeftUp = mixer.clipAction(gltf.animations[6]);
      frontLeftUp.clampWhenFinished = true;
      frontLeftUp.timeScale = 4;
      frontLeftUp.setLoop(THREE.LoopOnce);
      frontLeftUp.play();

      let backWingRight = mixer.clipAction(gltf.animations[10]);
      backWingRight.clampWhenFinished = true;
      backWingRight.timeScale = 4;
      backWingRight.setLoop(THREE.LoopOnce);
      backWingRight.play();
    });

    // handlers if directional buttons are released
    document.querySelector("#up").addEventListener("touchend", () => {
      clearTimeout(timeout);
      straightenUp();

      let backRightDownReturn = mixer.clipAction(gltf.animations[15]);
      backRightDownReturn.clampWhenFinished = true;
      backRightDownReturn.timeScale = 4;
      backRightDownReturn.setLoop(THREE.LoopOnce);
      backRightDownReturn.play();

      let backLeftDownReturn = mixer.clipAction(gltf.animations[19]);
      backLeftDownReturn.clampWhenFinished = true;
      backLeftDownReturn.timeScale = 4;
      backLeftDownReturn.setLoop(THREE.LoopOnce);
      backLeftDownReturn.play();
    });
    document.querySelector("#down").addEventListener("touchend", () => {
      clearTimeout(timeout);
      straightenDown();

      let backRightUpReturn = mixer.clipAction(gltf.animations[17]);
      backRightUpReturn.clampWhenFinished = true;
      backRightUpReturn.timeScale = 4;
      backRightUpReturn.setLoop(THREE.LoopOnce);
      backRightUpReturn.play();

      let backLeftUpReturn = mixer.clipAction(gltf.animations[21]);
      backLeftUpReturn.clampWhenFinished = true;
      backLeftUpReturn.timeScale = 4;
      backLeftUpReturn.setLoop(THREE.LoopOnce);
      backLeftUpReturn.play();

    });
    document.querySelector("#left").addEventListener("touchend", () => {
      clearTimeout(timeout);
      straightenLeft();

      let frontRightUpReturn = mixer.clipAction(gltf.animations[3]);
      frontRightUpReturn.clampWhenFinished = true;
      frontRightUpReturn.timeScale = 4;
      frontRightUpReturn.setLoop(THREE.LoopOnce);
      frontRightUpReturn.play();

      let frontLeftDownReturn = mixer.clipAction(gltf.animations[5]);
      frontLeftDownReturn.clampWhenFinished = true;
      frontLeftDownReturn.timeScale = 4;
      frontLeftDownReturn.setLoop(THREE.LoopOnce);
      frontLeftDownReturn.play();

      let backWingLeftReturn = mixer.clipAction(gltf.animations[9]);
      backWingLeftReturn.clampWhenFinished = true;
      backWingLeftReturn.timeScale = 4;
      backWingLeftReturn.setLoop(THREE.LoopOnce);
      backWingLeftReturn.play();
    });
    document.querySelector("#right").addEventListener("touchend", () => {
      clearTimeout(timeout);
      straightenRight();

      let frontRightDownReturn = mixer.clipAction(gltf.animations[1]);
      frontRightDownReturn.clampWhenFinished = true;
      frontRightDownReturn.timeScale = 4;
      frontRightDownReturn.setLoop(THREE.LoopOnce);
      frontRightDownReturn.play();

      let frontLeftUpReturn = mixer.clipAction(gltf.animations[7]);
      frontLeftUpReturn.clampWhenFinished = true;
      frontLeftUpReturn.timeScale = 4;
      frontLeftUpReturn.setLoop(THREE.LoopOnce);
      frontLeftUpReturn.play();

      let backWingRightReturn = mixer.clipAction(gltf.animations[11]);
      backWingRightReturn.clampWhenFinished = true;
      backWingRightReturn.timeScale = 4;
      backWingRightReturn.setLoop(THREE.LoopOnce);
      backWingRightReturn.play();
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

  // creating the hemisphere light 
  var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // creating a spotlight to have shadows
  let spotLight = new THREE.SpotLight(0xffffff);
  scene.add(spotLight);
  let spotLightHelper = new THREE.SpotLightHelper(spotLight);
  scene.add(spotLightHelper);
  spotLight.castShadow = true; 
}

/*
  Function: addShadowPlaneToScene
  Description: 
    Creates a plane that recieves shadows and adds it to the scene
  Parameters: None
*/
function addShadowPlaneToScene() {
  const geometry = new THREE.PlaneGeometry(1000, 1000); 
  const material = new THREE.ShadowMaterial(); 
  material.opacity = 0.5; 

  plane = new THREE.Mesh(geometry, material); 
  plane.receiveShadow= true; 
  plane.visible = false; 
  plane.rotateX(-Math.PI/2); 
  plane.matrixAutoUpdate = false; 
  scene.add(plane); 
}

/*
  Function addReticleToScene
  Description: 
    Creates a reticle of a holographic plane. 
  Paramaters: None
*/
function addReticleToScene() {
  const geometry = new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(
    -Math.PI / 2
  );
  const material = new THREE.MeshBasicMaterial();

  reticle = new THREE.Mesh(geometry, material);

  // we will calculate the position and rotation of this reticle every frame manually
  // in the render() function so matrixAutoUpdate is set to false
  reticle.matrixAutoUpdate = false;
  reticle.visible = false; // we start with the reticle not visible
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
  gltf = await loader.loadAsync("../assets/a52.glb"); 
  model = gltf.scene; 
  model.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true; 
      node.receiveShadow = true; 
    }
  }); 
  model.scale.set(0.1, 0.1, 0.1); 
  model.position.set(0, 0, 0); 
  model.visible = false;
}

/*
  Function: addBoundingBoxesToModels
  Description: 
    Creates a bounding box for the waypoint and the model. 
    Creates bounding boxes for the out of bound areas. 
  Parameters: None
*/
function addBoundingBoxesToModels() {
  modelBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()); 
  modelBB.setFromObject(model); 

  wallBBFront = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()); 
  const meshFront = new THREE.Mesh(new THREE.BoxGeometry(40, 40), new THREE.MeshBasicMaterial()); 
  meshFront.position.set(0, 0, -20); 
  //scene.add(meshFront); 
  wallBBFront.setFromObject(meshFront); 

  wallBBBack = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()); 
  const meshBack = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 0.25), new THREE.MeshBasicMaterial()); 
  meshBack.position.set(0, 0, 20); 
  //scene.add(meshBack); 
  wallBBBack.setFromObject(meshBack); 

  wallBBLeft = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()); 
  const meshLeft = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 0.25), new THREE.MeshBasicMaterial()); 
  meshLeft.position.set(-20, 0, 0); 
  meshLeft.rotation.y = Math.PI/2; 
  //scene.add(meshLeft); 
  wallBBLeft.setFromObject(meshLeft); 

  wallBBRight = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()); 
  const meshRight = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 0.25), new THREE.MeshBasicMaterial()); 
  meshRight.position.set(20, 0, 0); 
  meshRight.rotation.y = Math.PI/2;
  //scene.add(meshRight); 
  wallBBRight.setFromObject(meshRight); 

  wallBBGround = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()); 
  const meshGround = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 0.25), new THREE.MeshBasicMaterial()); 
  meshGround.position.set(0, -2, 0);
  meshGround.rotation.x = Math.PI / 2;  
  //scene.add(meshGround); 
  wallBBGround.setFromObject(meshGround); 

  wallBBCeiling = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3()); 
  const meshCeiling = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 0.25), new THREE.MeshBasicMaterial()); 
  meshCeiling.position.set(0, 20, 0); 
  meshCeiling.rotation.x = Math.PI / 2; 
  //scene.add(meshCeiling); 
  wallBBCeiling.setFromObject(meshCeiling); 
}

/*
  Function: setupGui
  Description: 
    Creates a gui to adjust the throttle of the plane between 1 and 10 with a step of 1.
    Gui is disabled. 
  Paramaters: None
*/
function setupGui () {
  pane = new Tweakpane.Pane(); 
  pane.containerElem_.style.zIndex = "10"; 
  pane.addInput(guiPARAM, 'throttle', {min: 0.1, max: 10, step:0.1})
  pane.disabled = true; 
}

/**************************************************************************************************************/

/*
  Function: onSelect
  Description: 
    Runs when the screen is tapped. 
    If the reticle is not visible, function will return. 
    If the reticle is visible, the directional buttons and the gui is enabled, the model is placed, and the reticle is hidden. 
  Parameters: None
*/
function onSelect() {

  // returns null if the reticle is not visible
  if (!reticle.visible || model.visible) {
    return;
  }

  // placing the model at the location of the reticle
  model.position.setFromMatrixPosition(reticle.matrix);
  model.quaternion.setFromRotationMatrix(reticle.matrix);
  model.rotation.y = Math.PI;
  model.visible = true;
  scene.add(model);

  // directional buttons become visible
  document.querySelector("#up").style.display = "block";
  document.querySelector("#down").style.display = "block";
  document.querySelector("#left").style.display = "block";
  document.querySelector("#right").style.display = "block";

  // gui is created and added to the scene
  pane.disabled = false;

  // reticle is removed from the scene
  reticle.visible = false;
  scene.remove(reticle);


  document.getElementById("instructions").textContent= "Tap the directional buttons at the bottom of the screen to move the bird and the throttle to control the speed of the bird."

  setTimeout(removeInstructions, 15000); 
}

/*
  Function: removeInstructions
  Description: 
    Runs 15 seconds after onSelect is called. 
    Sets the instuctions text to blank. 
  Parameters: None
*/
function removeInstructions() {
  document.getElementById("instructions").textContent= ""; 
}

/***************************************Functions For Directional Buttons***************************************/

/*
  Function: moveUp
  Description: 
    Rotates the model around the x-axis by PI/16
  Parameters: None
*/
function moveUp() {

  let rotationX = model.rotation.x + Math.PI / 16;

  new TWEEN.Tween(model.rotation).to({ x: rotationX }, 500).start();
  timeout = setTimeout(moveUp, 100);
}

/*
  Function: straightenUp
  Description: 
    Rotates the model around the x-axis by -PI/16
  Parameters: None
*/
function straightenUp() {

  let rotationX = 0;

  new TWEEN.Tween(model.rotation).to({ x: rotationX }, 1000).start();
}

/*
  Function: moveDown
  Description: 
    Rotates the model around the x-axis by -PI/16
  Parameters: None
*/
function moveDown() {
  let rotationX = model.rotation.x - Math.PI / 16;

  new TWEEN.Tween(model.rotation).to({ x: rotationX }, 500).start();

  timeout = setTimeout(moveDown, 100);
}

/*
  Function: straightenDown
  Description: 
    Rotates the model around the x-axis by PI/16
  Parameters: None
*/
function straightenDown() {

  let rotationX = 0;

  new TWEEN.Tween(model.rotation).to({ x: rotationX }, 1000).start();
}

/*
  Function: moveLeft
  Description: 
    Rotates the model around the z-axis by -PI/16 
    Rotates the model around the y-axis by PI/16
  Parameters: None
*/
function moveLeft() {

  let rotationZ = model.rotation.z - Math.PI / 16;
  let rotationY = model.rotation.y + Math.PI / 16;
  let direction = { x: model.rotation.x, y: rotationY, z: rotationZ };

  new TWEEN.Tween(model.rotation).to(direction, 500).start();

  timeout = setTimeout(moveLeft, 100);
}

/*
  Function: straightenLeft
  Description: 
    Rotates the model around the z-axis by PI/16
  Parameters: None
*/
function straightenLeft() {
  let rotationZ = 0;
  let direction = { z: rotationZ };
  new TWEEN.Tween(model.rotation).to(direction, 1000).start();
}

/*
  Function: moveRight
  Description: 
    Rotates the model around the z-axis by PI/16
    Rotates the model around the y-axis by -PI/16
  Parameters: None
*/
function moveRight() {

  let rotationZ = model.rotation.z + Math.PI / 16;
  let rotationY = model.rotation.y - Math.PI / 16;
  let direction = { x: model.rotation.x, y: rotationY, z: rotationZ };

  new TWEEN.Tween(model.rotation).to(direction, 500).start();

  timeout = setTimeout(moveRight, 100);
}

/*
  Function: straightenRight
  Description: 
    Rotates the model around the z-axis by -PI/16
  Parameters: None
*/
function straightenRight() {

  let rotationZ = 0;
  let direction = { z: rotationZ };

  new TWEEN.Tween(model.rotation).to(direction, 1000).start();

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
  const session = renderer.xr.getSession(); // XRSession

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

        plane.visible = true; 
        if (!planeCreated) {
          plane.matrix.fromArray(pose.transform.matrix); 
          planeCreated = true; 
        }

        reticle.visible = true;
      
        reticle.matrix.fromArray(pose.transform.matrix); 

      } else {
        reticle.visible = false;
      }
    }

    // Start the tween animations
    TWEEN.update(); 

    // if the model is visible, the model will move in the direction that it is facing at set speed
    if (model.visible) {
      let direction = new THREE.Vector3(); 
      model.getWorldDirection(direction); 
      model.position.add(direction.multiplyScalar(speed));

      // updates and handles the bounding box for the model
      modelBB.applyMatrix4(model.matrixWorld); 
      checkCollisions(); 
    }

    if (mixer) {
      let deltaTime = clock.getDelta(); 
      mixer.update(deltaTime); 
    }

    renderer.render(scene, camera);
  }
}

/* 
  Function: checkColllsions
  Description: 
    Determines if the bounding boxes of the cube and the model intersect one another.
    If there is an intersection, writes Congratulations to the screen and removes the cube from the scene. 
    
    Determines if the bounding boxes of the walls and the model intersect. 
    If there is an intersection, the model is turned 180 degrees. 
  Parameters: None
*/
function checkCollisions() {

  if (wallBBFront.intersectsBox(modelBB)  || wallBBLeft.intersectsBox(modelBB) || wallBBRight.intersectsBox(modelBB) || wallBBBack.intersectsBox(modelBB)) {

    let movement = new THREE.Vector3(); 
    model.getWorldDirection(movement);
    model.position.add(movement.multiplyScalar(-speed * 12));

    let rotationX = model.rotation.x; 
    let rotationY = model.rotation.y + Math.PI; 
    let rotationZ = model.rotation.z; 
    let direction = {x: rotationX, y: rotationY, z: rotationZ}; 

    new TWEEN.Tween(model.rotation).to(direction, 500).start();

    document.getElementById("warning").textContent= "We are too far away! I'm turning us back around!";
    setTimeout(removeWarning, 5000); 

  }

  if (wallBBGround.intersectsBox(modelBB)) {
    pane.disabled = true;
    speed = 0;  

    document.querySelector("#up").disabled = true;
    document.querySelector("#down").disabled = true;
    document.querySelector("#left").disabled = true;
    document.querySelector("#right").disabled = true;

    document.getElementById("warning").textContent= "Oh no! We crashed!"; 

  }
}

/*
  Function: removeWarning
  Description: 
    Runs 5 seconds after checkCollision recognizes a collision with one of the walls. 
  Parameters: None
*/
function removeWarning() {
  document.getElementById("warning").textContent= "";
}

