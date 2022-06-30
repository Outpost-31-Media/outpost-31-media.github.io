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


//debug stuff
let desktopTesting = false;
let physicsDebug = false;

// import { Ammo } from './js/ammo.js';
const {
    AmmoPhysics,
    PhysicsLoader
} = ENABLE3D;

let container;
let camera, scene, renderer, controller;
let reticle;
let plane;
let physics;
let planeCreated = false;
let clock = new THREE.Clock();
let deltaTime;
let rigidBodies = [],
    tmpTrans;
let ballObject = null;
let moveDirection = {
    left: 0,
    right: 0,
    forward: 0,
    back: 0
};
const STATE = {
    DISABLE_DEACTIVATION: 4
};
let ball;
let directionDictionary = ['forward', 'back', 'left', 'right'];
let moveButtons = [];
let startGate, endGate, holoGate, block, holoBlock, ramp, holoRamp;
let state = 0;
let spaceSeen = false;
let currentHolo;
let raceStarted = false;
let obstacles = [];
let currentObstacle = 0;
let numberOfObstacles = 1;
let gatesPlaced = false;
let directionalLight;
let dogsled;
let clones = [];

let dogsledStartPos;
// Ammo().then(start);

const Start = () => {
    // tmpTrans = new Ammo.btTransform();
    init();
    setupPhysicsWorld();
    loadGates();
    loadObstacles();

    animate();
    setupButtonEventHandlers();
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

    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
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

async function loadGates() {


    startGate = await loadGltf('./gltf/startGate.glb');
    startGate.visible = false;
    scene.add(startGate);

    endGate = await loadGltf('./gltf/endGate.glb');
    endGate.visible = false;
    scene.add(endGate);

    dogsled = await loadGltf('./gltf/dogSled.glb');
    dogsled.visible = false;
    scene.add(dogsled);

    holoGate = await loadGltf('./gltf/holoGate.glb');
    holoGate.visible = false;
    holoGate.matrixAutoUpdate = false;
    scene.add(holoGate);

    currentHolo = holoGate;


}

async function loadObstacles() {
    block = await loadGltf('./gltf/block.glb');
    block.visible = false;
    scene.add(block);

    holoBlock = await loadGltf('./gltf/holoBlock.glb');
    holoBlock.visible = false;
    holoBlock.matrixAutoUpdate = false;
    scene.add(holoBlock);

    ramp = await loadGltf('./gltf/ramp.glb');
    ramp.visible = false;
    scene.add(ramp);

    holoRamp = await loadGltf('./gltf/holoRamp.glb');
    holoRamp.visible = false;
    holoRamp.matrixAutoUpdate = false;
    scene.add(holoRamp);

    obstacles = [
        [block, holoBlock],
        [ramp, holoRamp]
    ];
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
    if (state == 0) {
        startGate.position.setFromMatrixPosition(currentHolo.matrix);
        startGate.quaternion.setFromRotationMatrix(currentHolo.matrix);
        dogsled.position.setFromMatrixPosition(currentHolo.matrix);
        dogsled.quaternion.setFromRotationMatrix(currentHolo.matrix);
        startGate.visible = true;
        state += 1;
        createBlock();
    } else if (state == 1) {
        endGate.position.setFromMatrixPosition(currentHolo.matrix);
        endGate.quaternion.setFromRotationMatrix(currentHolo.matrix);
        endGate.position.set(endGate.position.x, startGate.position.y, endGate.position.z)
        physics.add.existing(endGate, {
            shape: 'hull'
        })
        endGate.body.setCollisionFlags(5)
        console.log(endGate.body)
        endGate.visible = true;
        state += 1;
        // startRace();
    } else if (gatesPlaced && !raceStarted) {
        const clone = obstacles[(currentObstacle)][0].clone();
        clone.position.setFromMatrixPosition(currentHolo.matrix);
        clone.quaternion.setFromRotationMatrix(currentHolo.matrix);
        clone.visible = true;
        scene.add(clone);
        rigidBodyFromMesh(clone);
    }
}

function createBlock() {


    let scale = {
        x: 50,
        y: .15,
        z: 50
    };
    let mass = 0;


    // let blockPlane = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({
    //         color: 0xff0505
    //     }));
    let blockPlane = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.ShadowMaterial());

    
    blockPlane.scale.set(scale.x, scale.y, scale.z);
    blockPlane.castShadow = true;
    blockPlane.receiveShadow = true;
    // blockPlane.matrixAutoUpdate = false;
    blockPlane.position.setFromMatrixPosition(currentHolo.matrix);
    // blockPlane.quaternion.setFromRotationMatrix(currentHolo.matrix);
    scene.add(blockPlane);
    blockPlane.translateY((scale.y / 2) * -1)
    physics.add.existing(blockPlane, {
        shape: 'convex'
    });
    blockPlane.body.setCollisionFlags(2);


}

function rigidBodyFromMesh(meshObj) {
    meshObj.translateY(.4);
    physics.add.existing(meshObj, {
        shape: 'convex',
    })
    
    meshObj.body.setCollisionFlags(0)
    clones.push(meshObj);
}

function createBall() {
    dogsled.translateY(.4);
    dogsled.visible = true;
    dogsled.name = 'dogsled'
    physics.add.existing(dogsled, {
        shape: 'hull'
    });

    // console.log(dogsled);




}

function moveBall() {
    if (raceStarted) {
        // let a = dogsled.rotation.y * (180/Math.PI);
        // console.log(a)
        let vec = new THREE.Vector3();

        let sledRot = dogsled.getWorldDirection(vec);
        let sledTheta = Math.atan2(sledRot.x, sledRot.z);
        let a = sledTheta * (180 / Math.PI);
        // console.log(a)

        let scalingFactor = .1;

        let moveX = moveDirection.right - moveDirection.left;
        let moveZ = moveDirection.back - moveDirection.forward;
        let moveY = 0;


        dogsled.body.applyForce(
            (moveZ * scalingFactor) * Math.sin(sledTheta),
            0,
            (moveZ * scalingFactor) * Math.cos(sledTheta))
        dogsled.body.applyLocalTorque(0, 0, (moveZ * scalingFactor));

        dogsled.body.setAngularVelocityY((moveX * 3) * -1);
        // console.log(dogsled.getWorldDirection(vec))
        // console.log(vec)

        // ball.body.applyForceX(moveX * scalingFactor);
        // ball.body.applyForceY(moveY * scalingFactor);
        // console.log(dogsledStartPos)

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
        space: viewerSpace
    });

    localSpace = await session.requestReferenceSpace("local");

    hitTestSourceInitialized = true;

    session.addEventListener("end", () => {
        hitTestSourceInitialized = false;
        hitTestSource = null;
    });
}

function render(timestamp, frame) {
    deltaTime = clock.getDelta() * 1000;
    if (frame) {
        if (!hitTestSourceInitialized) {
            initializeHitTestSource();
        }

        if (hitTestSourceInitialized) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                spaceSeen = true;
                const hit = hitTestResults[0];

                // the hit test "pose" represents the position/rotation of a point on the floor
                // so a point that our hit test ray intersected with the floor
                const pose = hit.getPose(localSpace);

                if (!raceStarted) {
                    currentHolo.visible = true;
                    currentHolo.matrix.fromArray(pose.transform.matrix);
                } else {
                    currentHolo.visible = false;
                }
            }
        }
        moveBall();
        updatePhysics(deltaTime);
        renderer.render(scene, camera);

    }
    updateDom();
}

function setupButtonEventHandlers() {
    const fwBtn = document.getElementById('forwardBtn');
    const backBtn = document.getElementById('backBtn');
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const functionBtn = document.getElementById('functionBtn');
    const functionBtn1 = document.getElementById('functionBtn1');
    const functionBtn2 = document.getElementById('functionBtn2');
    const restartBtn = document.getElementById('restartBtn');


    moveButtons = [fwBtn, backBtn, leftBtn, rightBtn];
    moveButtons.forEach(function(btn) {
        // console.log(btn);
        btn.style.display = "none";
    });
    restartBtn.style.display = "none";
    functionBtn.style.display = "none";
    functionBtn1.style.display = "none";
    functionBtn2.style.display = "none";
    // fwBtn.style.display = "block";
    //Uncomment for testing on desktop
    if (desktopTesting) {
        fwBtn.addEventListener("mousedown", function() {
            handleButtonDown(0)
        }, false);
        fwBtn.addEventListener("mouseup", function() {
            handleButtonUp(0)
        }, false);
        backBtn.addEventListener("mousedown", function() {
            handleButtonDown(1)
        }, false);
        backBtn.addEventListener("mouseup", function() {
            handleButtonUp(1)
        }, false);
        leftBtn.addEventListener("mousedown", function() {
            handleButtonDown(2)
        }, false);
        leftBtn.addEventListener("mouseup", function() {
            handleButtonUp(2)
        }, false);
        rightBtn.addEventListener("mousedown", function() {
            handleButtonDown(3)
        }, false);
        rightBtn.addEventListener("mouseup", function() {
            handleButtonUp(3)
        }, false);
    }

    fwBtn.addEventListener('beforexrselect', ev => ev.preventDefault());
    restartBtn.addEventListener('beforexrselect', ev => ev.preventDefault());
    backBtn.addEventListener('beforexrselect', ev => ev.preventDefault());
    leftBtn.addEventListener('beforexrselect', ev => ev.preventDefault());
    rightBtn.addEventListener('beforexrselect', ev => ev.preventDefault());
    functionBtn.addEventListener('beforexrselect', ev => ev.preventDefault());
    functionBtn1.addEventListener('beforexrselect', ev => ev.preventDefault());
    functionBtn2.addEventListener('beforexrselect', ev => ev.preventDefault());
    //Make XR buttons not interact with stuff behind

    functionBtn.addEventListener("click", startRace, false);
    restartBtn.addEventListener("click", restartRace, false);
    functionBtn1.addEventListener("click", function() {
        cycleObstacles(0)
    }, false);
    functionBtn2.addEventListener("click", function() {
        cycleObstacles(1)
    }, false);

    fwBtn.addEventListener("touchstart", function() {
        handleButtonDown(0)
    }, false);
    fwBtn.addEventListener("touchend", function() {
        handleButtonUp(0)
    }, false);
    backBtn.addEventListener("touchstart", function() {
        handleButtonDown(1)
    }, false);
    backBtn.addEventListener("touchend", function() {
        handleButtonUp(1)
    }, false);
    leftBtn.addEventListener("touchstart", function() {
        handleButtonDown(2)
    }, false);
    leftBtn.addEventListener("touchend", function() {
        handleButtonUp(2)
    }, false);
    rightBtn.addEventListener("touchstart", function() {
        handleButtonDown(3)
    }, false);
    rightBtn.addEventListener("touchend", function() {
        handleButtonUp(3)
    }, false);
}

function startRace() {
    console.log('hello')
    raceStarted = true;
    functionBtn.style.display = "none";
    functionBtn1.style.display = "none";
    functionBtn2.style.display = "none";
    moveButtons.forEach(function(btn) {
        // console.log(btn);
        btn.style.display = "block";
    });
    clones.forEach(function(clone) {
        clone.body.setCollisionFlags(2);
    });
    createBall();
    // physics.add.collider(dogsled, endGate, endRace);

    endGate.body.on.collision((otherObject, event) => {
            if (otherObject.name == 'dogsled') {
                endRace();
            }
        })
        // dogsled.body.on.collision((otherObject, event) => {
        //     console.log(otherObject)
        // })
    const x = dogsled.position.x;
    const y = dogsled.position.y;
    const z = dogsled.position.z;
    dogsledStartPos = [x, y, z];
}

function endRace() {
    restartBtn.style.display = "block";
    moveButtons.forEach(function(btn) {
        // console.log(btn);
        btn.style.display = "none";
    });
    moveDirection = {
        left: 0,
        right: 0,
        forward: 0,
        back: 0
    };
    document.getElementById("overlay").innerHTML = '<h1><strong>You Won!!</strong></h1>';
}

function restartRace() {
    // console.log(dogsledStartPos)
    dogsled.body.setCollisionFlags(2);
    dogsled.position.set(dogsledStartPos[0], dogsledStartPos[1], dogsledStartPos[2]);
    dogsled.body.needUpdate = true;
    dogsled.body.once.update(() => {
        dogsled.body.setCollisionFlags(0)
        dogsled.body.setVelocity(0, 0, 0)
        dogsled.body.setAngularVelocity(0, 0, 0)
    });
    moveButtons.forEach(function(btn) {
        // console.log(btn);
        btn.style.display = "block";
    });
    restartBtn.style.display = "none";
    document.getElementById("overlay").innerHTML = '';
}

function cycleObstacles(direction) {
    currentHolo.visible = false;
    numberOfObstacles = obstacles.length - 1;
    if (direction == 0) {
        if (currentObstacle != numberOfObstacles) {
            currentObstacle += 1;
        } else {
            currentObstacle = 0;
        }
    } else if (direction == 1) {
        if (currentObstacle == 0) {
            currentObstacle = numberOfObstacles;
        } else {
            currentObstacle -= 1;
        }
    }
    // currentHolo = obstacles[currentObstacle[1]];

    currentHolo = obstacles[(currentObstacle)][1];
    currentHolo.visible = true;

}

function handleButtonDown(button) {
    moveDirection[directionDictionary[button]] = 1;
    // console.log(moveDirection);

}

function handleButtonUp(button) {
    moveDirection[directionDictionary[button]] = 0;
    // console.log(moveDirection);
}

function updateDom() {
    if (!hitTestSourceInitialized) {
        document.getElementById("overlay").innerHTML = '<h1>Welcome to webXR @ Outpost31 </br>tap Start AR to continue</h1>';
    } else if (!spaceSeen) {
        document.getElementById("overlay").innerHTML = '<h3>look around the world and to let your phone calculate the space</h3>';
    } else if (state == 0) {
        document.getElementById("overlay").innerHTML = '<p><strong> Place the start gate for the race and tap your screen to continue</strong></p>';
    } else if (state == 1) {
        document.getElementById("overlay").innerHTML = '<p><strong> Place the end gate for the race</strong></p>';
    } else if (state > 1 && !raceStarted) {
        functionBtn.style.display = "block";
        functionBtn1.style.display = "block";
        functionBtn2.style.display = "block";
        if (gatesPlaced == false) {
            cycleObstacles(0);
        }
        gatesPlaced = true;
        document.getElementById("overlay").innerHTML = '';
    };

}

function updatePhysics(deltaTime) {

    // Step world
    physics.update(deltaTime)
    if (physicsDebug) {
        physics.updateDebugger()
    }
    

}

PhysicsLoader('./js/ammo', () => Start())

// start();

//new Project({ gravity: { x: 0, y: -9.81, z: 0 }, maxSubSteps: 4, fixedTimeStep: 1 / 60 })