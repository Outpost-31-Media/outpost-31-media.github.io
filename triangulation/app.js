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
let clips, action, action2;
let clock = new THREE.Clock();

init();
animate();

async function init () {
	const container = document.createElement('div');
	document.body.appendChild(container);
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);
	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

	//config renderer
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.xr.enabled = true;
	container.appendChild(renderer.domElement);

	// add light
	var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 4);
	light.position.set(0.5, 1, 0.25);
	scene.add(light);

	//config tap controller
	controller = renderer.xr.getController(0);
	controller.addEventListener('select', onSelect);
	scene.add(controller);

	//import webxr and add ar button  

  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"]
  });
  document.body.appendChild(button)

	//window resize listener
	window.addEventListener('resize', onWindowResize, false);
	addGeometry();
}

async function addGeometry() {
	reticle = await loadGltf('./gltf/reticle2.glb');
	//console.log(reticle);
	reticle.matrixAutoUpdate = false;
  reticle.visible = false;
	scene.add(reticle);

	foxArr = await loadGltf('./gltf/plane.glb');
	fox = foxArr[0];
	clips = foxArr[1];
	console.log(clips);
	mixer = new THREE.AnimationMixer(fox);
	fox.visible = false;
	scene.add(fox);
	action = mixer.clipAction(clips[0]);
  action2 = mixer.clipAction(clips[1]);

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
	if (reticle.visible && pinned <= 2) {
		const pin = pins[pinned];
		
		pin.visible = true;
		pin.position.setFromMatrixPosition(reticle.matrix);
		pin.quaternion.setFromRotationMatrix(reticle.matrix);

		pinned += 1;
		if (pinned > 2) {
			drawsomelines();
		};

	};

}

function drawsomelines() {
 lineGeometryA = new THREE.BufferGeometry().setFromPoints([
 	pin0.position,
 	pin1.position
 ]);
  lineGeometryB = new THREE.BufferGeometry().setFromPoints([
 	pin1.position,
 	pin2.position
 ]);
 lineMaterial = new THREE.LineBasicMaterial({color: "yellow"});
 lineA = new THREE.Line(lineGeometryA, lineMaterial);
 scene.add(lineA);
 lineB = new THREE.Line(lineGeometryB, lineMaterial);
 scene.add(lineB);
 locateOrgin();
}

function locateOrgin() {
	point0 = getPointInBetweenByPerc(pin0.position, pin1.position, .45);
	// const clone = pin1.clone();
 //  clone.position.set(point0.x, point0.y, point0.z);
 //  clone.visible = true;
 //  scene.add(clone);

  point1 = getPointInBetweenByPerc(point0, pin0.position, .76);;
  fox.position.set(point1.x, point1.y, point1.z);

	rotateAroundPoint(point0, fox, 0, 1.48353, 0);
  fox.visible = true;
  fox.lookAt(pin2.position);
  fox.rotateY(-.9);

  spawned = true;
  action.play();
  action2.play();

  reticle.visible = false;
  for (const pin of pins) {
  	pin.visible = false;
  }
  lineA.visible = false;
  lineB.visible = false;
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
  mixer.update(delta);
	renderer.render(scene, camera);
}