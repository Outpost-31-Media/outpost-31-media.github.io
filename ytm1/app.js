import { ARButton } from 'https://unpkg.com/three@0.126.0/examples/jsm/webxr/ARButton.js';
import { makeGltfMask, loadGltf, getImageBitmap, getPointInBetweenByPerc, rotateAroundPoint } from './utils.js'

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
let fox, foxArr;
let point0;
let point1;
let mixer;
let groundPlane;
let clips, action, action2;
let directionalLight;
let clock = new THREE.Clock();
let mixerBuilt = false;
let testOrb;
let pane;
let spotLight;
let spotLightHelper;
let shadowCameraHelper;
const PARAMS = {
        x: -1,
        y: 1.7,
        z: 3.4,
        intensity: 9,
        distance: 20,
        angle: 0.2
    };

setupGui();
init();
animate();

function setupGui() {
    pane = new Tweakpane.Pane();
    pane.containerElem_.style.zIndex = "10000";
    
    pane.addInput(
      PARAMS, 'x',
      {min: -5, max: 5, step: 0.1} 
    );
    pane.addInput(
      PARAMS, 'y',
      {min: -5, max: 5, step: 0.1}
    );
    pane.addInput(
      PARAMS, 'z',
      {min: -5, max: 5, step: 0.1}
    );
    pane.addInput(
      PARAMS, 'intensity',
      {min: 1, max: 20, step: 1}
    );
    pane.addInput(
      PARAMS, 'distance',
      {min: 1, max: 20, step: 0.1}
    );
    pane.addInput(
      PARAMS, 'angle',
      {min: 0, max: 90, step: 0.1} // angle cannot be more than Math.PI/2 = 90 degrees
    );
}

async function init () {
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

	// add light
	// var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 4);
	// light.position.set(0.5, 1, 0.25);
	// scene.add(light);
	const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
	light.position.set(0.5, 1, 0.25);
	scene.add(light);


	//config tap controller
	controller = renderer.xr.getController(0);
	controller.addEventListener('select', onSelect);
	scene.add(controller);


	const color = new THREE.Color("rgb(255, 0, 0)");
  spotLight = new THREE.SpotLight(color, PARAMS.intensity, PARAMS.distance, PARAMS.angle);
  spotLight.position.set(PARAMS.x, PARAMS.y, PARAMS.z);
  scene.add(spotLight);
  // This spotlight helper helps to visualize the shape of the spotlight
  spotLightHelper = new THREE.SpotLightHelper(spotLight);
  scene.add(spotLightHelper);
  
  // shadows
  spotLight.castShadow = true;
	//import webxr and add ar button  


  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test", "dom-overlay"],
    domOverlay: {
    	root: document.body
    }
  });
  document.body.appendChild(button)


  pane.on('change', (ev) => {
    const type = ev.presetKey; // what slider was changed
    const value = ev.value; // the number value on the slider
    
    switch(type) {
      case 'x':
        spotLight.position.x = value;
        break;
      case 'y':
        spotLight.position.y = value;
        break;
      case 'z':
        spotLight.position.z = value;
        break;
      case 'intensity':
        spotLight.intensity = value;
        break;
      case 'distance':
        spotLight.distance = value;
        break;
      case 'angle':
        console.log(THREE.MathUtils.degToRad(value));
        spotLight.angle = THREE.MathUtils.degToRad(value);
        break;
      default:
        break;
    }
	});

	//window resize listener
	window.addEventListener('resize', onWindowResize, false);
	
 // important!
	// const light = new THREE.DirectionalLight( 0xffffff, 4 );
	// light.castShadow = true;
	// scene.add( light );

	addGeometry();
	
}

async function addGeometry() {
	reticle = await loadGltf('./gltf/reticle2.glb');
	//console.log(reticle);
	reticle.matrixAutoUpdate = false;
  reticle.visible = false;
	scene.add(reticle);

	foxArr = await loadGltf('./gltf/otter.glb');
	fox = foxArr[0];
	clips = foxArr[1];
	// console.log(clips);
	await buildMixer(fox);
	action = mixer.clipAction(clips[0]);
  action2 = mixer.clipAction(clips[1]);
	console.log(mixer);
	fox.visible = false;
	scene.add(fox);
	fox.traverse((node) => {
		if(node.isMesh) {
			node.castShadow = true;
			node.recieveShadow = true;
			// console.log(node);
		}
	})


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


function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSelect() {
	if (reticle.visible && pinned <= 1) {
		const pin = pins[pinned];
		
		pin.visible = true;
		pin.position.setFromMatrixPosition(reticle.matrix);
		pin.quaternion.setFromRotationMatrix(reticle.matrix);

		pinned += 1;
		if (pinned > 1) {
			drawsomelines();
		};

	};

}

function drawsomelines() {
 lineGeometryA = new THREE.BufferGeometry().setFromPoints([
 	pin0.position,
 	pin1.position
 ]);
 //  lineGeometryB = new THREE.BufferGeometry().setFromPoints([
 // 	pin1.position,
 // 	pin2.position
 // ]);
 lineMaterial = new THREE.LineBasicMaterial({color: "yellow"});
 lineA = new THREE.Line(lineGeometryA, lineMaterial);
 scene.add(lineA);
 // lineB = new THREE.Line(lineGeometryB, lineMaterial);
 // scene.add(lineB);
 locateOrgin();
}

function loadSphereMesh () {
	const geometry = new THREE.IcosahedronGeometry(0.1,1);
	const material = new THREE.MeshPhongMaterial({
		color : new THREE.Color("rgb(226,35,213)"),
		shininess : 6,
	});
	testOrb = new THREE.Mesh(geometry, material);
	testOrb.castShadow = true;
	testOrb.recieveShadow = true;
	testOrb.visible = false;
	scene.add(testOrb);
}

function locateOrgin() {
	point0 = getPointInBetweenByPerc(pin0.position, pin1.position, .47);
	const clone = pin1.clone();
  clone.position.set(point0.x, point0.y, point0.z);
  clone.visible = true;
  scene.add(clone);

  // point1 = getPointInBetweenByPerc(point0, pin0.position, .76);;
  fox.position.set(point0.x, point0.y, point0.z);

	rotateAroundPoint(pin0.position, fox, 0, -.3176499, 0);
  fox.visible = true;
  fox.lookAt(pin0.position);
  fox.rotateY(-0.3560472);
  fox.rotateY(3.14159);


  const geometry = new THREE.PlaneGeometry(40, 40);
  geometry.rotateX(-Math.PI / 2);

  // const material = new THREE.MeshBasicMaterial({
  // 	color: 0xfff00,
  // 	side: THREE.DoubleSide,
  // 	opacity: 0.4
  // });
  const material = new THREE.ShadowMaterial();
  material.opacity = 0.5;

  groundPlane = new THREE.Mesh(geometry, material);
  groundPlane.recieveShadow = true;
  groundPlane.visible = true;
  groundPlane.position.setFromMatrixPosition(fox.matrix);
  groundPlane.quaternion.setFromRotationMatrix(fox.matrix);
  scene.add(groundPlane);

  loadSphereMesh();
  testOrb.position.setFromMatrixPosition(fox.matrix);
  testOrb.translateY(.1);
  testOrb.visible = true;

  spawned = true;
  action.setDuration(15);
  action.setLoop( THREE.LoopOnce );
  action.play();
  action2.play(); //prop

  // reticle.visible = false;
  // for (const pin of pins) {
  // 	pin.visible = false;
  // }
  // lineA.visible = false;
  // lineB.visible = false;
}

async function buildMixer(object) {
	mixer = new THREE.AnimationMixer(object);
	mixerBuilt = true;
}


function animate () {
	
	renderer.setAnimationLoop(render);


}


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


function render (timestamp, frame) {
	spotLightHelper.update();
	if (frame) {

		if(!hitTestSourceInitialized){
      initializeHitTestSource();
     }
          
    if(hitTestSourceInitialized){
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      //console.log(hitTestResults); 
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(localSpace);
        if (!spawned) {
        	reticle.visible = true;
      	};
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }          
    
  }
  const delta = clock.getDelta();
  if (mixerBuilt) {
  	mixer.update(delta);
	}
	renderer.render(scene, camera);
}