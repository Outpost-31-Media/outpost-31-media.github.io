import { ARButton } from 'https://unpkg.com/three@0.126.0/examples/jsm/webxr/ARButton.js';
import { makeGltfMask, loadGltf, getImageBitmap } from './utils.js'

let camera, scene, renderer, controller, reticle, cubes, mask;
let spawned = false;
let pose;

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
	var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
	light.position.set(0.5, 1, 0.25);
	scene.add(light);

	//config tap controller
	controller = renderer.xr.getController(0);
	controller.addEventListener('select', onSelect);
	scene.add(controller);

	//import webxr and add ar button  

	const url = "./assets/spiny_bush_viper.jpg";
  const imgBitmap = await getImageBitmap(url);
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["image-tracking"], // notice a new required feature
    trackedImages: [
      {
        image: imgBitmap, // tell webxr this is the image target we want to track
        widthInMeters: 0.09
      }
    ]
  });
  document.body.appendChild(button)

	//window resize listener
	window.addEventListener('resize', onWindowResize, false);
	addGeometry();
}

async function addGeometry() {
	reticle = await loadGltf('./gltf/reticle.glb');
	//console.log(reticle);
	reticle.matrixAutoUpdate = false;
  reticle.visible = false;
	scene.add(reticle);

	mask = await loadGltf('./gltf/cubemask.glb');
	mask.visible = false;
	makeGltfMask(mask);
	mask.renderOrder = 0;
	scene.add(mask);

	cubes = await loadGltf('./gltf/cubescene3.glb');
	cubes.visible = false;
	cubes.renderOrder = 1;
	// cubes.matrixAutoUpdate = false;
	scene.add(cubes);


}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSelect() {
	if (reticle.visible && !spawned) {
		mask.visible = true;
		cubes.visible = true;
		cubes.position.setFromMatrixPosition(reticle.matrix); 
    cubes.quaternion.setFromRotationMatrix(reticle.matrix);
    mask.position.setFromMatrixPosition(reticle.matrix); 
    mask.quaternion.setFromRotationMatrix(reticle.matrix);
		spawned = true;
		reticle.visible = false;
	};

}
function updateModel () {
	cubes.position.setFromMatrixPosition(reticle.matrix); 
  cubes.quaternion.setFromRotationMatrix(reticle.matrix);
  mask.position.setFromMatrixPosition(reticle.matrix); 
  mask.quaternion.setFromRotationMatrix(reticle.matrix);
}

function animate () {
	renderer.setAnimationLoop(render);
}

function updateMesh(pose) {
	
	reticle.matrix.fromArray(pose.transform.matrix);

}

function render (timestamp, frame) {
	if (frame) {
    const results = frame.getImageTrackingResults();
    for (const result of results) {
      // The result's index is the image's position in the trackedImages array specified at session creation
      const imageIndex = result.index;
      // Get the pose of the image relative to a reference space.
      const referenceSpace = renderer.xr.getReferenceSpace();
      pose = frame.getPose(result.imageSpace, referenceSpace);
      
      const state = result.trackingState;
      console.log(state);
      if (state == "tracked") {
        // do something when image is tracked
        console.log("Image target has been found")
        if (!spawned) { reticle.visible = true; }
        updateMesh(pose);
        updateModel();
      } else if (state == "emulated") {
        // do something when image is lost
        reticle.visible = false; 
        console.log("Image target no longer seen")
      }
    }
    
  }
	renderer.render(scene, camera);
}