import {
    ARButton
} from "https://unpkg.com/three@0.133.0/examples/jsm/webxr/ARButton.js";
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
let camera, scene, renderer, controller, physics, deltaTime;
const STATE = {
    DISABLE_DEACTIVATION: 4
};
let rigidBodies = [],
    tmpTrans,
    directionalLight;
let clock = new THREE.Clock();
let forest;
let orgin = [0, -.5, -1];
let iterateTime = Infinity;
let iterateStep = 5000;
let time;


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
        return await loader.loadAsync('./gltf/tree.glb')
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
                    this.getNeibours(treeToLight).forEach(anotherTreeToLight =>{
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
            neiCors.push([(treeCor[0]-1),treeCor[1]]);
        }
        if (treeCor[1] != 0) {
            neiCors.push([treeCor[0],(treeCor[1]-1)]);
        }
        if (treeCor[0] != this.height-1) {
            neiCors.push([(treeCor[0]+1),treeCor[1]]);
        }
        if (treeCor[1] != this.width-1) {
            neiCors.push([treeCor[0],(treeCor[1]+1)]);
        }
        neiCors.forEach(neiCor => {
            neiTrees.push(this.findTree(neiCor));
        });
        return neiTrees;  
    }
    getTreesByState(state){
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
        this.maxBurnTime = Math.floor(Math.random() * (6 - 3) ) + 3;
        this.object3D = this.build();
    }
    build() {
        this.geometry = this.models.scene;
        const tileSize = this.geometry.children[0].scale.x;
        this.pos = [((this.cor[0]-this.radius[0])*tileSize)+this.orgin[0], this.orgin[1], ((this.cor[1]-this.radius[1])*tileSize)+this.orgin[2]];
        const clone = this.geometry.clone();
        this.scene.add(clone);
        clone.getObjectByName('burntTree').visible = false;
        clone.getObjectByName('fire').visible = false;
        clone.position.set(this.pos[0],this.pos[1],this.pos[2]);
        // console.log(`pos ${pos}`) //this assumes that all tiles for forest fire are square
        return clone;
    }
    light() {
        if (this.state == 0) {
            this.state = 1;
            this.object3D.getObjectByName('burntTree').visible = true;
            this.object3D.getObjectByName('fire').visible = true;
            this.object3D.getObjectByName('greenTree').visible = false;
            this.timeBurning = 1;
            // console.log(`tree ${this.cor} lit`)
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
    extinguish() {
        this.state = 2;
        this.object3D.getObjectByName('fire').visible = false;
    }

}

const Start = () => {
    init();
    setupPhysicsWorld();
    animate();
    buildForest();
};

function init() {
    container = document.createElement("div");
    document.body.appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    directionalLight = new THREE.DirectionalLight();
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048 * 2;
    directionalLight.shadow.mapSize.height = 2048 * 2;
    directionalLight.shadow.camera.near = 0.05;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    // addPlaneToScene();
    // addPlaneToSceneThatReceivesShadows();

    const button = ARButton.createButton(renderer, {
        optionalFeatures: ["dom-overlay"],
        domOverlay: {
            root: document.body
        },
        requiredFeatures: ["hit-test"] // notice a new required feature
    });
    document.body.appendChild(button);
    renderer.domElement.style.display = "none";

    window.addEventListener("resize", onWindowResize, false);
}

function buildForest() {
    forest = new Forest(30, 30, scene, orgin);


}

function forestCallback() {
    console.log(forest);
    const testtree = forest.findTree([3,5]);
    testtree.light();
    startBurning();
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

function onSelect() {

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updatePhysics(deltaTime) {

    // Step world
    physics.update(deltaTime)
    if (physicsDebug) {
        physics.updateDebugger()
    }


}

function animate() {

    renderer.setAnimationLoop(render);
}


function render(timestamp, frame) {
    deltaTime = clock.getDelta() * 1000;
    if (frame) {
        // if (!hitTestSourceInitialized) {
        //     initializeHitTestSource();
        // }

        // if (hitTestSourceInitialized) {
        //     const hitTestResults = frame.getHitTestResults(hitTestSource);

        //     if (hitTestResults.length > 0) {
        //         spaceSeen = true;
        //         const hit = hitTestResults[0];

        //         // the hit test "pose" represents the position/rotation of a point on the floor
        //         // so a point that our hit test ray intersected with the floor
        //         const pose = hit.getPose(localSpace);

        //         if (!raceStarted) {
        //             currentHolo.visible = true;
        //             currentHolo.matrix.fromArray(pose.transform.matrix);
        //         } else {
        //             currentHolo.visible = false;
        //         }
        //     }
        // }
        // moveBall();
        updatePhysics(deltaTime);
        renderer.render(scene, camera);


    }
    if (timestamp >= iterateTime) {
        iterateTime += iterateStep;
        iterateFire();
    }
        
    time = timestamp;
    // updateDom();
}


PhysicsLoader('./lib/ammo', () => Start())