import { ARButton } from 'https://unpkg.com/three@0.133.0/examples/jsm/webxr/ARButton.js';

// variables for the scene
let camera, scene, renderer;
let model;
let controller;
let reticle;
let loader;
let gltf;
let mixer;
let action;
let delta;

const clock = new THREE.Clock();

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
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  // adding light to the scene
  var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  // adding the hit testing reticle
  addReticleToScene();

  // loads the model
  loader = new THREE.GLTFLoader();
  gltf = await loader.loadAsync("../assets/newbird.glb");
  model = gltf.scene;
  model.visible = false;

  // gets the animations
  mixer = new THREE.AnimationMixer(model);
  action = mixer.clipAction(gltf.animations[1]);

  // Add the AR button to the body of the DOM
  const button = ARButton.createButton(renderer, {
    optionalFeatures: ["dom-overlay", "dom-overlay-for-handheld-ar"],
    domOverlay: { root: document.body },
    requiredFeatures: ["hit-test"],
  });

  document.body.appendChild(button);
  renderer.domElement.style.display = "none";

  button.addEventListener("click", () => {
    document.getElementById("text").style.color = "white";
    document.getElementById("text").textContent = "Find an open area. Tap your screen once a reticle appears on the ground."
  });

  window.addEventListener("resize", onWindowResize, false);
}

/*
  Function: addReticleToScene
  Description: 
    Adds a reticle for hit testing to the scene. 
  Parameters: none
*/
function addReticleToScene() {
  const geometry = new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(
    -Math.PI / 2
  );
  const material = new THREE.MeshBasicMaterial();

  reticle = new THREE.Mesh(geometry, material);

  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);
}

/*
  Function: onSelect
  Description: 
    Runs everytime the screne is tapped. 
    If the model is not visible, it adds the model to the scene. 
    If the model and the reticle are visible, it moves the model to the position of the reticle. 
  Parameters: None
*/
function onSelect() {

  // if the model has already been placed
  if (reticle.visible && model.visible) {

    model.visible = true;
    let miliseconds = 5000;

    let reticlePosition = new THREE.Vector3();

    reticlePosition.setFromMatrixPosition(reticle.matrixWorld);

    let reticlePositionCoords = { x: reticlePosition.x, y: reticlePosition.y, z: reticlePosition.z };

    let time = { t: 0 };
    let start = model.quaternion.clone();
    model.lookAt(reticlePosition);
    let end = model.quaternion.clone();
    model.quaternion.copy(start);

    // turning the model towards the reticle with Tween.js
    new TWEEN.Tween(time).to({ t: 1 }, 1000).onUpdate(() => {
      THREE.Quaternion.slerp(start, end, model.quaternion, time.t);
    }).easing(TWEEN.Easing.Quadratic.InOut).start();

    // moving the model towards the reticle with Tween.js
    new TWEEN.Tween(model.position).to(reticlePositionCoords, miliseconds).easing(TWEEN.Easing.Quadratic.InOut).start();

    // playing the models animation when the model is moving
    action.setDuration(miliseconds / 1000);
    action.setLoop(THREE.LoopOnce);
    action.play();
    action.reset();

    // if the model has not been placed
  } else if (reticle.visible) {
    model.position.setFromMatrixPosition(reticle.matrix);
    model.quaternion.setFromRotationMatrix(reticle.matrix);
    model.scale.set(0.005, 0.005, 0.005);
    model.visible = true;
    scene.add(model);
    document.getElementById("text").textContent = "Tap your screen to move the model where there is a reticle on the ground."
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

    // updating the Tween
    TWEEN.update();

    // mixer for the animation
    delta = clock.getDelta();
    if (mixer) {
      mixer.update(delta);
    }

    renderer.render(scene, camera);
  }
}