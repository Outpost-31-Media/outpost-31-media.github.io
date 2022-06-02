import {
    ARButton
} from "https://unpkg.com/three@0.133.0/examples/jsm/webxr/ARButton.js";

// import { Ammo } from './js/ammo.js';

let container;
let camera, scene, renderer;
let reticle;
let plane;
let physicsWorld;
let planeCreated = false;
let clock = new THREE.Clock();
let deltaTime;
let rigidBodies = [],
    tmpTrans;

Ammo().then(start);

function start() {
    tmpTrans = new Ammo.btTransform();
    setupPhysicsWorld();
    init();
    animate();
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
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // addPlaneToScene();
    // addPlaneToSceneThatReceivesShadows();

    const button = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"] // notice a new required feature
    });
    document.body.appendChild(button);
    renderer.domElement.style.display = "none";

    window.addEventListener("resize", onWindowResize, false);
}


function setupPhysicsWorld() {

    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
        dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
        overlappingPairCache = new Ammo.btDbvtBroadphase(),
        solver = new Ammo.btSequentialImpulseConstraintSolver();

    physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
    physicsWorld.setGravity(new Ammo.btVector3(0, -5, 0));

}


function createBlock(pose) {


    let scale = {
      x: 50,
      y: .15,
      z: 50
    };
    let mass = 0;


    let placerObj = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({
    color: 0xa0afa4
    }));
    placerObj.scale.set(scale.x, scale.y, scale.z);
    placerObj.visible = false;
    placerObj.matrixAutoUpdate = false;
    scene.add(placerObj);
    placerObj.matrix.fromArray(pose.transform.matrix);



    let blockPlane = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.ShadowMaterial());
    blockPlane.translateY((scale.y/2)*-1)
    blockPlane.scale.set(scale.x, scale.y, scale.z);
    blockPlane.castShadow = true;
    blockPlane.receiveShadow = true;
    // blockPlane.matrixAutoUpdate = false;
    blockPlane.position.setFromMatrixPosition(placerObj.matrix);
    blockPlane.quaternion.setFromRotationMatrix(placerObj.matrix);
    scene.add(blockPlane);
    
    const vector = blockPlane.position;
    let pos = {
        x: vector.x,
        y: vector.y,
        z: vector.z
    };
    const quatVector = blockPlane.quaternion;
    let quat = {
        x: quatVector.x,
        y: quatVector.y,
        z: quatVector.z,
        w: quatVector.w
    };


    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    let motionState = new Ammo.btDefaultMotionState(transform);

    let colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));
    colShape.setMargin(0.05);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    colShape.calculateLocalInertia(mass, localInertia);

    let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
    let body = new Ammo.btRigidBody(rbInfo);

    body.setRestitution(.9);
    physicsWorld.addRigidBody(body);
    createBall(pos, quat);
    // createBall1(pos, quat);

}

function createBall(cubePos, cubeQuat){
    
    let pos = {x: cubePos.x, y: (cubePos.y+2), z: cubePos.z};
    let radius = .2;
    let quat = {x: cubeQuat.x, y: cubeQuat.y, z: cubeQuat.z, w: cubeQuat.w};
    let mass = .1;

    //threeJS Section
    let ball = new THREE.Mesh(new THREE.SphereBufferGeometry(radius), new THREE.MeshPhongMaterial({color: 0xff0505}));

    ball.position.set(pos.x, pos.y, pos.z);
    
    ball.castShadow = true;
    ball.receiveShadow = true;


    scene.add(ball);


    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btSphereShape( radius );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );

    body.setRestitution(.9);
    physicsWorld.addRigidBody( body );
    
    ball.userData.physicsBody = body;

    rigidBodies.push(ball);
}

function createBall1(cubePos, cubeQuat){
    
    let pos = {x: cubePos.x+.1, y: (cubePos.y+2.4), z: cubePos.z};
    let radius = .2;
    let quat = {x: cubeQuat.x, y: cubeQuat.y, z: cubeQuat.z, w: cubeQuat.w};
    let mass = .1;

    //threeJS Section
    let ball = new THREE.Mesh(new THREE.SphereBufferGeometry(radius), new THREE.MeshPhongMaterial({color: 0xff0505}));

    ball.position.set(pos.x, pos.y, pos.z);
    
    ball.castShadow = true;
    ball.receiveShadow = true;


    scene.add(ball);


    //Ammojs Section
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin( new Ammo.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new Ammo.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    let motionState = new Ammo.btDefaultMotionState( transform );

    let colShape = new Ammo.btSphereShape( radius );
    colShape.setMargin( 0.05 );

    let localInertia = new Ammo.btVector3( 0, 0, 0 );
    colShape.calculateLocalInertia( mass, localInertia );

    let rbInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, colShape, localInertia );
    let body = new Ammo.btRigidBody( rbInfo );

    body.setRestitution(.9);
    physicsWorld.addRigidBody( body );
    
    ball.userData.physicsBody = body;
    
    rigidBodies.push(ball);
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
    deltaTime = clock.getDelta();
    if (frame) {
        if (!hitTestSourceInitialized) {
            initializeHitTestSource();
        }

        if (hitTestSourceInitialized) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];

                // the hit test "pose" represents the position/rotation of a point on the floor
                // so a point that our hit test ray intersected with the floor
                const pose = hit.getPose(localSpace);

                if (!planeCreated) {
                    createBlock(pose);
                    planeCreated = true;
                }
            }
        }

        updatePhysics( deltaTime );
        renderer.render(scene, camera);
    }
}


function updatePhysics( deltaTime ){

    // Step world
    physicsWorld.stepSimulation( deltaTime, 10 );

    // Update rigid bodies
    for ( let i = 0; i < rigidBodies.length; i++ ) {
        let objThree = rigidBodies[ i ];
        let objAmmo = objThree.userData.physicsBody;
        let ms = objAmmo.getMotionState();
        if ( ms ) {

            ms.getWorldTransform( tmpTrans );
            let p = tmpTrans.getOrigin();
            let q = tmpTrans.getRotation();
            objThree.position.set( p.x(), p.y(), p.z() );
            objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

        }
    }

}