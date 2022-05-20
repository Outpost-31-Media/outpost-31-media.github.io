import { ARButton } from 'https://unpkg.com/three@0.126.0/examples/jsm/webxr/ARButton.js';
import { makeGltfMask, loadGltf, getImageBitmap, getPointInBetweenByPerc, rotateAroundPoint } from './utils.js'

//todo consolidate variables
let camera, scene, renderer, controller, reticle, pin0, pin2, pin1;
let pinned = 0;
let spawned = false;
let pose;
let pins = [];
let hitTestSource = null;
let localSpace = null;
let hitTestSourceInitialized = false;
let lineGeometryA;
let lineGeometryB;
let lineMaterial;
let lineA;
let lineB;
let flight, flightArr;
let point0;
let point1;
let mixer;
let shadowCatcher;
let flightClips, flightAction0, flightAction1; //action 0 is plane flying, action 1 is prop spinning
let directionalLight;
let landing, landingArr, landingClips, landingAction0, landingAction1;
let clock = new THREE.Clock();
let mixerBuilt = false;
let testOrb;
let pane;
let threeDtitles;
let spotLight;
let spotLightHelper;
let shadowCameraHelper;
let globalTimestamp;
let planeSet = false;
let spaceSeen = false;
const PARAMS = {
        x: -1,
        y: 1.7,
        z: 3.4,
        intensity: 9,
        distance: 20,
        angle: 0.2
    };
let flightStarted = false;
let landingMixer;
let landingMixerBuilt = false;

init();
animate();


//setup renderer, lights, and AR
function init () {
	const container = document.createElement('div');
	document.body.appendChild(container);
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);
	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

	//config renderer
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.xr.enabled = true;
	container.appendChild(renderer.domElement);

	//ambient world light
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
	light.position.set(0.5, 1, 0.25);
	scene.add(light);


	//config tap controller
	controller = renderer.xr.getController(0);
	controller.addEventListener('select', onSelect);
	scene.add(controller);

  //shadown light
  directionalLight = new THREE.DirectionalLight();
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048*2;
  directionalLight.shadow.mapSize.height = 2048*2;
  directionalLight.shadow.camera.near = 0.05;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);




  loadReticle();
  loadPins();
  loadFlightGltf();
  // loadTestOrb();
  loadTitles();
  loadPlaneLanding();
  loadShadowCatcher();

  //Import webXR and the start AR buttom (dom overlay for tweakpane)
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test", "dom-overlay"],
    domOverlay: {
    	root: document.body
    }
  });
  document.body.appendChild(button)



  window.addEventListener('resize', onWindowResize, false);
}


//handles window resizing from init()
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}



//geometry loaders
async function loadReticle () {
  reticle = await loadGltf('./gltf/reticle2.glb');
  //console.log(reticle);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);
}

async function loadPins () {
  pin0 = await loadGltf('./gltf/pin0.glb');
  pin0.visible = false;
  scene.add(pin0);

  pin1 = await loadGltf('./gltf/pin1.glb');
  pin1.visible = false;
  scene.add(pin1);

  pin2 = await loadGltf('./gltf/pin2.glb');
  pin2.visible = false;
  scene.add(pin2);

  pins = [pin0, pin1, pin2];
}

async function loadFlightGltf () {
  flightArr = await loadGltf('./gltf/otter1.glb');
  flight = flightArr[0];
  flightClips = flightArr[1];
  // console.log(clips);
  await buildMixer(flight);
  flightAction0 = mixer.clipAction(flightClips[0]);
  flightAction1 = mixer.clipAction(flightClips[1]);
  // console.log(mixer);
  flight.visible = false;
  scene.add(flight);

  //goes through every mesh and child and sets to cast shadow
  flight.traverse((node) => {
    if(node.isMesh) {
      node.castShadow = true;
      node.recieveShadow = true;
      // console.log(node);
    }
  })
}

function loadTestOrb () {
  const geometry = new THREE.IcosahedronGeometry(0.1, 1);
  const material = new THREE.MeshPhongMaterial({
    color      :  new THREE.Color("rgb(226,35,213)"),
    shininess  :  6,
  });
      
  testOrb = new THREE.Mesh(geometry, material);
  testOrb.position.set(-0.3, 0, -0.5);
  testOrb.receiveShadow = true;
  testOrb.castShadow = true;
  scene.add(testOrb);
}

async function loadTitles () {
  threeDtitles = await loadGltf('./gltf/reticle2.glb');
  threeDtitles.visible = false;
  scene.add(threeDtitles);
}

async function loadPlaneLanding () {
  landingArr = await loadGltf('./gltf/planelanding.glb');
  landing =  landingArr[0];
  landingClips = landingArr[1];
  // console.log(clips);
  // await buildMixer(landing);
  landingMixer = new THREE.AnimationMixer(landing);
  landingMixerBuilt = true;
  landingAction0 = landingMixer.clipAction(landingClips[0]);
  landingAction1 = landingMixer.clipAction(landingClips[1]);
  // console.log(mixer);
  landing.visible = false;
  scene.add(landing);

  //goes through every mesh and child and sets to cast shadow
  landing.traverse((node) => {
    if(node.isMesh) {
      node.castShadow = true;
      node.recieveShadow = true;
      // console.log(node);
    }
  })
}

function loadShadowCatcher () {
  const geometry = new THREE.PlaneGeometry(40, 40); 
  geometry.rotateX(-Math.PI / 2); // make the plane parallel to floor
  const material = new THREE.ShadowMaterial();
  material.opacity = 0.9;

  shadowCatcher = new THREE.Mesh(geometry, material);
  shadowCatcher.receiveShadow = true;
  shadowCatcher.visible = false;
  // shadowCatcher.matrixAutoUpdate = false;
  scene.add(shadowCatcher);
}


//calls when user taps their screen from init()
function onSelect() {
  if (reticle.visible && pinned <= 1) {
    //places shadow catcher at first pin its giant so it will cover the plinth
    if (!planeSet) {
      shadowCatcher.visible = true;
      shadowCatcher.position.setFromMatrixPosition(reticle.matrix);
      shadowCatcher.quaternion.setFromRotationMatrix(reticle.matrix);
      planeSet = true;
    };

    const pin = pins[pinned];
    
    pin.visible = true;
    pin.position.setFromMatrixPosition(reticle.matrix);
    pin.quaternion.setFromRotationMatrix(reticle.matrix);

    pinned += 1;
    if (pinned > 1) {
      locateFlight();
    };

  };

}

//calculate the orgin of map and place flight animation and play
function locateFlight () {
  point0 = getPointInBetweenByPerc(pin0.position, pin1.position, .47);

  // point1 = getPointInBetweenByPerc(point0, pin0.position, .76);;
  flight.position.set(point0.x, point0.y, point0.z);

  rotateAroundPoint(pin0.position, flight, 0, -.3176499, 0);
  flight.visible = true;
  flight.lookAt(pin0.position);
  flight.rotateY(-0.3560472);
  flight.rotateY(3.14159);

  spawned = true;
  flightAction0.setLoop( THREE.LoopOnce );
  flightAction0.clampWhenFinished = true;
  flightAction0.play();
  flightAction1.play(); //prop

  landing.position.setFromMatrixPosition(flight.matrix);
  landing.quaternion.setFromRotationMatrix(flight.matrix);

  // flightStarted = true;
  mixer.addEventListener( 'finished', (e) => {
    startSecondAnimation();

  } );

}
//future sam this is why things arent working
function startSecondAnimation() {
  console.log('thisran');
  landing.visible = true;
  landingAction0.setLoop( THREE.LoopOnce );
  landingAction0.clampWhenFinished = true;
  landingAction0.play();
  landingAction1.setLoop( THREE.LoopOnce );
  landingAction1.clampWhenFinished = true;
  landingAction1.play();
  flightStarted = false
}
//mixer is for handeling animations
async function buildMixer(object) {
  mixer = new THREE.AnimationMixer(object);
  mixerBuilt = true;
}

function updateDom () {
  if (!hitTestSourceInitialized) {
    document.getElementById("overlay").innerHTML = '<h1>Welcome to webXR @ Yukon Transportation Museum</br>tap Start AR to continue</h1>';
  } else if (!spaceSeen) {
    document.getElementById("overlay").innerHTML = '<h3>look around the map and to let your phone calculate the space</h3>';
  } else if (pinned == 0) {
    document.getElementById("overlay").innerHTML = '<p>In the summer of 1943 somebody bought four Fairchild model 71 airplanes and brought them to Carcross. </br><strong> Place a pin at Carcross by lining up your reticle and tapping your screen.</strong></p>';
  } else if (pinned == 1) {
    document.getElementById("overlay").innerHTML = '<p>These airplanes made some trips between atlin and carcross carying all sorts of things </br><strong> Place a pin at Atlin.</strong></p>';
  } else {
    document.getElementById("overlay").innerHTML = '';
  };
  
}
//animate runs ones and starts the renderer
function animate() {
  renderer.setAnimationLoop(render);
}

//creates refrence spaces for hit testing
async function initializeHitTestSource() {
  const session = renderer.xr.getSession();
  const viewerSpace = await session.requestReferenceSpace("viewer");//get viewer space basically orgin of the phone that always moves with phone
  hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  // console.log(hitTestSource);
  localSpace = await session.requestReferenceSpace("local");
  // console.log(localSpace);
  hitTestSourceInitialized = true;
 
  session.addEventListener("end", () => {
    hitTestSourceInitialized = false;
    hitTestSource = null;
  });
}

//runs every frame called from animate()
function render (timestamp, frame) {
  // spotLightHelper.update();
  globalTimestamp = timestamp;
  if (frame) {

    if(!hitTestSourceInitialized){
      initializeHitTestSource();
     }
          
    if(hitTestSourceInitialized){
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      //console.log(hitTestResults); 
      if (hitTestResults.length > 0) {
        spaceSeen = true;
        const hit = hitTestResults[0];
        const pose = hit.getPose(localSpace);
        if (!spawned) {
          reticle.visible = true;
        } else {
          reticle.visible = false;
        };
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }          
    
  }
  const delta = clock.getDelta();
  if (mixerBuilt && landingMixerBuilt) {
    mixer.update(delta);
    landingMixer.update(delta);
  }
  renderer.render(scene, camera);
  updateDom();
}