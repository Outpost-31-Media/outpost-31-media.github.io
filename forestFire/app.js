import { ARButton } from 'https://unpkg.com/three@0.133.0/examples/jsm/webxr/ARButton.js';
import {
  makeGltfMask,
  loadGltf,
  getImageBitmap,
  getPointInBetweenByPerc,
  rotateAroundPoint
} from './utils.js'
let desktopTesting = false;
let physicsDebug = false;
const {
  AmmoPhysics,
  PhysicsLoader
} = ENABLE3D;
let container;

const STATE = {
  DISABLE_DEACTIVATION: 4
};
let rigidBodies = [],
  tmpTrans,
  directionalLight;
let clock = new THREE.Clock();
let forest;
let orgin = [0, -1.75, -1];
let iterateTime = Infinity;
let iterateStep = 2000;
let time;

// Initializing Variables
let camera, scene, renderer, physics, deltaTime;
let model;
let controller;
let reticle;
let loader;
let gltf;
let mixer; 
let plane;
let timeout;

let waterParticles = [];

// Bounding boxes Variables
let modelBB, wallBBFront, wallBBLeft, wallBBRight, wallBBGround, wallBBCeiling, wallBBBack;

// Gui Variables
let speed = 0.1 * 0.001;
let pane;
const guiPARAM = {
  throttle: 0.1
}


/**************************************************************************************************************/

class Forest {
  constructor(height, width, scene, orgin) {
    this.height = height;
    this.width = width;
    this.scene = scene;
    this.radius = [this.height / 2, this.width / 2];
    this.orgin = orgin;
    this.init();
  }
  async init() {
    this.models = await this.loadModels();
    this.trees = this.build();
    forestCallback();
  }
  async loadModels() {
    const loader = new THREE.GLTFLoader();
    // return {
    //     green: await loader.loadAsync('./gltf/greentree.glb'),
    //     burning: await loader.loadAsync('./gltf/burningtree.glb'),
    //     burnt: await loader.loadAsync('./gltf/burnttree.glb')
    // }
    return await loader.loadAsync('./gltf/tile1.glb')
  }
  build() {
    this.trees = []
    for (let h = 0; h < this.height; h++) {
      this.trees.push([]);
      for (let w = 0; w < this.width; w++) {
        this.trees[h][w] = new Tree([h, w], scene, this.models, orgin, this.radius);
      }
    }
    return this.trees;
  }
  iterateFire() {
    const lastBurn = this.getTreesByState(1);
    // console.log(`${lastBurn.length} trees burning`)
    const treesToLight = [];
    lastBurn.forEach(burningTree => {
      this.getNeibours(burningTree).forEach(treeToLight => {
        const randomFac = Math.random();
        if (randomFac <= .33) {
          treeToLight.light();
        } else if (randomFac >= .66) {
          treeToLight.light();
          this.getNeibours(treeToLight).forEach(anotherTreeToLight => {
            const newRandomFac = Math.random();
            if (newRandomFac <= .5) {
              anotherTreeToLight.light();
            };
          });
        };

      });
      burningTree.burnOut();
    });

  }
  getNeibours(tree) {
    const neiCors = [];
    const neiTrees = [];
    const treeCor = tree.cor;
    if (treeCor[0] != 0) {
      neiCors.push([(treeCor[0] - 1), treeCor[1]]);
    }
    if (treeCor[1] != 0) {
      neiCors.push([treeCor[0], (treeCor[1] - 1)]);
    }
    if (treeCor[0] != this.height - 1) {
      neiCors.push([(treeCor[0] + 1), treeCor[1]]);
    }
    if (treeCor[1] != this.width - 1) {
      neiCors.push([treeCor[0], (treeCor[1] + 1)]);
    }
    neiCors.forEach(neiCor => {
      neiTrees.push(this.findTree(neiCor));
    });
    return neiTrees;
  }
  getTreesByState(state) {
    let treesByState = [];
    this.trees.forEach(row => {
      row.forEach(tree => {
        if (tree.state == state) {
          treesByState.push(tree);
        }
      });
    });
    return treesByState;
  }
  findTree(cor) {
    // console.log(`finding tree ${cor}`)
    return this.trees[cor[0]][cor[1]];
  }
}

class Tree {
  constructor(cor, scene, models, orgin, radius) {

    this.cor = cor;
    this.state = 0;
    this.orgin = orgin;
    this.radius = radius;
    this.models = models;
    this.scene = scene;
    this.timeBurning = 0;
    this.wetness = 0;
    this.maxBurnTime = Math.floor(Math.random() * (6 - 3)) + 3;
    this.object3D = this.build();
  }
  build() {
    this.geometry = this.models.scene;
    const tileSize = this.geometry.getObjectByName('ground').scale.x * 2;
    this.pos = [((this.cor[0] - this.radius[0]) * tileSize) + this.orgin[0], this.orgin[1], ((this.cor[1] - this.radius[1]) * tileSize) + this.orgin[2]];
    const clone = this.geometry.clone();
    clone.rotation.y = ((Math.floor(Math.random() * (1 - 3)) + 1) * 90) * (Math.PI / 180.0);
    this.scene.add(clone);
    clone.getObjectByName('burntTree').visible = false;
    clone.getObjectByName('fire').visible = false;
    clone.getObjectByName('burnedGround').visible = false;
    clone.position.set(this.pos[0], this.pos[1], this.pos[2]);
    // console.log(`pos ${pos}`) //this assumes that all tiles for forest fire are square
    return clone;
  }
  light() {
    if (this.state == 0 && this.wetness == 0) {
      this.state = 1;
      this.object3D.getObjectByName('burntTree').visible = true;
      this.object3D.getObjectByName('fire').visible = true;
      this.object3D.getObjectByName('greenTree').visible = false;
      this.object3D.getObjectByName('flower').visible = false;
      this.object3D.getObjectByName('burnedGround').visible = true;
      this.object3D.getObjectByName('ground').visible = false;
      this.timeBurning = 1;
      // console.log(`tree ${this.cor} lit`)
    } else if (this.state == 0 && this.wetness != 0) {
      this.wetness -= 1;
    };

  }
  burnOut() {
    if (this.timeBurning >= this.maxBurnTime) {
      this.state = 2;
      this.object3D.getObjectByName('fire').visible = false;
    } else {
      this.timeBurning += 1;
    }

  }
  water() {
    if (this.state == 1) {
      this.state = 2;
      this.object3D.getObjectByName('fire').visible = false;
    } else if (this.state == 0 && this.wetness < 3) {
      this.wetness += 1;
    }

  }

}

/**************************************************************************************************************/

const Start = () => {
  init();
  setupPhysicsWorld();
  animate();
  buildForest();
};

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
  const button = ARButton.createButton(renderer, {
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body },
    requiredFeatures: ["hit-test"],
  });
  document.body.appendChild(button);
  renderer.domElement.style.display = "none";

  button.addEventListener("click", () => {
    document.getElementById("instructions").style.color = "white";
    document.getElementById("instructions").textContent = "Find an open area. Look around the room to calibrate the space. Tap your screen once a reticle appears on the ground."
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
      backRightDown.timeScale =4; 
      backRightDown.setLoop(THREE.LoopOnce); 
      backRightDown.play(); 

      let backLeftDown = mixer.clipAction(gltf.animations[18]); 
      backLeftDown.clampWhenFinished = true; 
      backLeftDown.timeScale =4; 
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
      frontLeftDownReturn.timeScale =4; 
      frontLeftDownReturn.setLoop(THREE.LoopOnce); 
      frontLeftDownReturn.play(); 
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

    });
  } else {
    // handlers if directional buttons are pushed
    document.querySelector("#up").addEventListener("touchstart", () => {
      timeout = setTimeout(moveUp, 100);

      let backRightDown = mixer.clipAction(gltf.animations[14]); 
      backRightDown.clampWhenFinished = true; 
      backRightDown.timeScale =4; 
      backRightDown.setLoop(THREE.LoopOnce); 
      backRightDown.play(); 

      let backLeftDown = mixer.clipAction(gltf.animations[18]); 
      backLeftDown.clampWhenFinished = true; 
      backLeftDown.timeScale =4; 
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

      let frontLeftDown = mixer.clipAction(gltf.animations[5]); 
      frontLeftDown.clampWhenFinished = true; 
      frontLeftDown.timeScale = 4; 
      frontLeftDown.setLoop(THREE.LoopOnce); 
      frontLeftDown.play(); 
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
    });

  }

  document.querySelector("#water").addEventListener("click", dropWater); 

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
  let directionalLight = new THREE.DirectionalLight();
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048 * 2;
  directionalLight.shadow.mapSize.height = 2048 * 2;
  directionalLight.shadow.camera.near = 0.05;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);
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
  plane.receiveShadow = true;
  plane.visible = false;
  plane.rotateX(-Math.PI / 2);
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
  gltf = await loader.loadAsync("./gltf/a52.glb");
  model = gltf.scene;
  model.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  model.scale.set(0.025, 0.025, 0.025); 
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
  meshFront.position.set(0, 0, -7);
  wallBBFront.setFromObject(meshFront);

  wallBBBack = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  const meshBack = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 0.25), new THREE.MeshBasicMaterial());
  meshBack.position.set(0, 0, 15);
  //scene.add(meshBack); 
  wallBBBack.setFromObject(meshBack);

  wallBBLeft = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  const meshLeft = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 0.25), new THREE.MeshBasicMaterial());
  meshLeft.position.set(-15, 0, 0);
  meshLeft.rotation.y = Math.PI / 2;
  //scene.add(meshLeft); 
  wallBBLeft.setFromObject(meshLeft);

  wallBBRight = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  const meshRight = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 0.25), new THREE.MeshBasicMaterial());
  meshRight.position.set(15, 0, 0);
  meshRight.rotation.y = Math.PI / 2;
  //scene.add(meshRight); 
  wallBBRight.setFromObject(meshRight);

  wallBBGround = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
  const meshGround = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 0.25), new THREE.MeshBasicMaterial());
  meshGround.position.set(0, -1.8, 0);
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
function setupGui() {
  pane = new Tweakpane.Pane();
  pane.containerElem_.style.zIndex = "10";
  pane.addInput(guiPARAM, 'throttle', { min: 0.1, max: 10, step: 0.1 })
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
  startBurning();
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
  document.querySelector("#water").style.display = "block";

  // gui is created and added to the scene
  pane.disabled = false;

  // reticle is removed from the scene
  reticle.visible = false;
  scene.remove(reticle);


  document.getElementById("instructions").textContent = "Tap the directional buttons at the bottom of the screen to move the bird and the throttle to control the speed of the bird."

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
  document.getElementById("instructions").textContent = "";
}

/*********************************************Functions For Buttons*********************************************/

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

/*
  Function: randomNumber
  Description: 
    Returns a random number between the given min and max values. 
  Parameters
    - min: a float that represents the minimum value
    - max: a float that represents the maximum value
*/
function randomNumber(min, max) {
  return (Math.random() * (max - min) + min); 
}

/*
  Function: dropWater
  Description: 
    Function runs when the drop water button is clicked. 
    Create boxes with physics below the plane model an adds them to an array.
  Parameters: None
*/
function dropWater() {

  let modelPosition = new THREE.Vector3(); 
  modelPosition.setFromMatrixPosition(model.matrixWorld); 

  waterParticles = []; 
  for ( let i = 0; i< 30; i++) {

    let size = randomNumber(0.01, 0.02); 
    let offset = randomNumber(-0.1, 0.1); 

    let geometry = new THREE.BoxBufferGeometry(); 
    let material = new THREE.MeshLambertMaterial({color: 'blue'}); 
    let cube = new THREE.Mesh(geometry, material); 
    cube.position.set( modelPosition.x - offset,  modelPosition.y, modelPosition.z - offset); 
    cube.scale.set(size, size, size); 
    scene.add(cube); 
    physics.add.existing(cube); 
    waterParticles.push(cube); 
  }

  //setTimeout(removeWater, 5000); 
}

/* 
  Function: removeWater
  Description: 
    Runs five seconds after dropWater is called.
    Destroys the water particles.
  Parameters: None
*/
function removeWater() {
  for (let i =0; i< waterParticles.length; i++) {
    let water = waterParticles[i]; 
    physics.destroy(water); 
  }
  waterParticles = []; 
}

/**************************************************************************************************************/

function buildForest() {
  forest = new Forest(30, 30, scene, orgin);
}

function forestCallback() {
  console.log(forest);
  const testtree = forest.findTree([3, 5]);
  testtree.light();

}

function iterateFire() {
  forest.iterateFire();
}

function startBurning() {
  iterateTime = iterateStep + time;
}

function setupPhysicsWorld() {
  physics = new AmmoPhysics(scene, {
    maxSubSteps: 4,
    fixedTimeStep: 1 / 240,
  })
  if (physicsDebug) {
    physics.debug.enable(true)
  }
  // console.log(physics);
  // console.log(physics.fixedTimeStep);

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
  deltaTime = clock.getDelta();
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

    // runs if the model is visible
    if (model.visible) {

      // moves the model in the direction it is facing 
      let direction = new THREE.Vector3();
      model.getWorldDirection(direction);
      model.position.add(direction.multiplyScalar(speed));

      // updates and handles the bounding box for the model
      modelBB.applyMatrix4(model.matrixWorld);

      checkBoxCollisions();
      checkWaterCollisions(); 
    }

    updatePhysics(deltaTime * 1000);

    if (mixer) {
      mixer.update(deltaTime); 
    }

    renderer.render(scene, camera);
  }

  if (timestamp >= iterateTime) {
    iterateTime += iterateStep;
    iterateFire();
  }

  time = timestamp;
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
function checkBoxCollisions() {

  if (wallBBFront.intersectsBox(modelBB) || wallBBLeft.intersectsBox(modelBB) || wallBBRight.intersectsBox(modelBB) || wallBBBack.intersectsBox(modelBB)) {

    let movement = new THREE.Vector3();
    model.getWorldDirection(movement);
    model.position.add(movement.multiplyScalar(-speed * 20));

    let rotationX = model.rotation.x;
    let rotationY = model.rotation.y + Math.PI;
    let rotationZ = model.rotation.z;
    let direction = { x: rotationX, y: rotationY, z: rotationZ };

    new TWEEN.Tween(model.rotation).to(direction, 500).start();

    document.getElementById("instructions").textContent = "We are too far away! I'm turning us back around!";
    setTimeout(removeWarning, 5000);

  } else if (wallBBGround.intersectsBox(modelBB)) {
    pane.disabled = true;
    speed = 0;

    document.querySelector("#up").disabled = true;
    document.querySelector("#down").disabled = true;
    document.querySelector("#left").disabled = true;
    document.querySelector("#right").disabled = true;

    document.getElementById("instructions").textContent = "Oh no! We crashed!";

  } else if (wallBBCeiling.intersectsBox(modelBB)) {
    /* TODO 
        Determine what to do when the model collides with the ceiling. 
          - Force the model to move down a bit, keeping direction of movement? 
          - Turn model completely around? 
        Add a warning message saying that the model is too high
    */
  }


}

/*
  Function: checkWaterCollisions
  Description: 
    Iterates through the water particles and the trees. 
    Determines if a water particles intersects a tree. 
    If there is an intersection, the tree is watered. 
  Parameters: None
*/
function checkWaterCollisions() {
  for (let i = 0; i < waterParticles.length; i++) {

    let water = waterParticles[i]; 
    let waterBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    waterBB.setFromObject(water);

    for (let j = 0; j < forest.trees.length; j++) {

      let row = forest.trees[j]; 

      for (let k = 0; k< row.length; k++) {

        let treeBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
        let tree = row[k];  
        treeBB.setFromObject(tree.object3D); 

        if (waterBB.intersectsBox(treeBB)) {
          tree.water(); 
        }
      }
    } 
  }

}

function updatePhysics(deltaTime) {

  // Step world
  physics.update(deltaTime)
  if (physicsDebug) {
    physics.updateDebugger()
  }
}

/*
  Function: removeWarning
  Description: 
    Runs 5 seconds after checkCollision recognizes a collision with one of the walls. 
  Parameters: None
*/
function removeWarning() {
  document.getElementById("instructions").textContent = "";
}

PhysicsLoader('./lib/ammo', () => Start())