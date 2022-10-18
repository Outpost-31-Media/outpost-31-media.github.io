/************************************************************************************** 
YTM Project:

    1) The user will be prompted to open the AR experience. 

    2) A loading screen with fun anicdotes (ex. Refuiling plane before takeoff) to load the models will appear. This loading screen could also show info about the experience 
    and where to find more information about it. 

    3) A reticle the size of the terrain wll appear on screen. The user will also be given instruction on how to use the experiences as an overlay on the screen. 

    4) Once the user determines where to place the terrain and taps the screen at the desired location, the terrain appears as a textured solid colour. 
    The starting town (Atlin or Carcross) will pop out of the terrain fully textured. The town will be vibrant which will be in contrast with the texture surrounding it. 
    Some clouds will be floating over the town. 

    5) A button to start the experience appears. When clicked, the plane emerges from the clouds over the starting town. 
    The plane controls will also be displayed and the user will be able to manuver the plane.  

    6) The user flies the plane through the terrain towards the finishing town. As you fly over terrain, the tecture will change from the solid colour to the greyscale aerial photographs. 
    Along the way, the user will encounter various challenges (birds, wind, forest fires, storms) that they will have to manuver around. 
    Between the challanges, 3D text will grow out of the ground providing information about the BXF. We hope that this portion of the experience will take approximately 45 seconds. 

    7) Once the plane comes within a certain range of the finishing town, the plane controls will dissapear and the plane flies itself into a cloud floating over the finishing town. 

    8) A congratulations messenge will appear and a button to exit the AR experience. 

    9) The user will be taken to an ending splash page with relevant information about the plane, locations, etc. 

**************************************************************************************/


import { ARButton } from "../lib/ARButton.js";
// import { EffectComposer } from './lib/EffectComposer.js';
// import  * as RenderPass  from './lib/RenderPass.js';
// import * as SAOPass  from './lib/SAOPass.js';
console.log('loading Three JS Version R' + THREE.REVISION);

// initilizing global variables
let container;
let camera, scene, renderer;
let smallerScene;
let controller;
let reticle;
let spotLight;
let timeout;
let scenePlaced = false;
let modelMixer;
let modelAnims = [];
// initializing model global variables
let loader;
let model;
let modelGltf;
let modelBB;
let gltfTerrain;
let terrain;
let terrainBB; 
let mixer;
let movingAnimation;
let placerCube;
let planePos = {x: 0, y: 0, z: 0};
let worldAnims = [];
let planeMoveAmmount = .15;
let clock = new THREE.Clock();
let arButton
let spotLightHelper;
let videoTexture;
let hemisphereLight;
let projectorSpotLight;
let flightCompleted;
let sepiaTex;
let started = false;
let xrSessionStarted = false;
let textEmptys = [];
// let myRegEx = new RegExp("[a-zA-Z]extEmpty+[0-9]{3}");
// tp run mousedown/touchstart

//set desktop testing to true if localhost
let desktopTesting = false;
var url = document.location.href;
if (url.includes('localhost') || url.includes('127.0.0.1')) {
    desktopTesting = true;
}
console.log('desktop testing is ' + desktopTesting);


document.querySelector("#load").addEventListener("click", () => {
    document.querySelector("#load").style.display = "none";
    document.getElementById("welcomeText").textContent = "This flight takes you over the traditional territories of the Carcross Tagish First Nation and the Taku River Tlingit. ";
    init();
    animate();
});

async function init() {
    container = document.createElement("div");
    document.body.appendChild(container);

    scene = new THREE.Scene();
    smallerScene = new THREE.Scene();
    scene.add(smallerScene);

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    // renderer.toneMappingWhitePoint = 1.0;
    renderer.physicallyCorrectLights = true;
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);



    // To run onSelect when a hit occurs 
    controller = renderer.xr.getController(0);
    controller.addEventListener("select", onSelect);
    scene.add(controller);

    // initializing the light in the scene
    loadProjectorTexture();
    addLightToScene();

    //loading the models
    loadTerrain();
    

    // Add the AR button to the body of the DOM
    arButton = ARButton.createButton(renderer, {
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: document.body },
        requiredFeatures: ["hit-test"],
    });

    renderer.domElement.style.display = "none";


    arButton.addEventListener("click", () => {
      if (!xrSessionStarted) {
        document.getElementById("welcome").style.display = 'none';
        document.getElementById("instructions").textContent = "Find an open area. Look around the room to calibrate the space.";
        xrSessionStarted = true;
      } else if (xrSessionStarted) {
        console.log('exit')
        location.href = './congrats.html';
      }
      
    });

    // if start button is clicked, startAR function is called
    document.querySelector("#start").addEventListener("click", startAR);
    // runs if directional buttons are called
    if (desktopTesting) {
        document.querySelector("#up").addEventListener("mousedown", () => {
            planePos.y = planeMoveAmmount;
        });
        document.querySelector("#up").addEventListener("mouseup", () => {
            planePos.y = 0;
        });
        document.querySelector("#down").addEventListener("mousedown", () => {
            planePos.y = planeMoveAmmount * -1;
        });
        document.querySelector("#down").addEventListener("mouseup", () => {
            planePos.y = 0;
        });
        document.querySelector("#right").addEventListener("mousedown", () => {
            planePos.x = planeMoveAmmount *-1;
        });
        document.querySelector("#right").addEventListener("mouseup", () => {
            planePos.x = 0;
        });
        document.querySelector("#left").addEventListener("mousedown", () => {
            planePos.x = planeMoveAmmount;
        });
        document.querySelector("#left").addEventListener("mouseup", () => {
            planePos.x = 0;
        });
    } else {
        document.querySelector("#up").addEventListener("touchstart", () => {
            planePos.y = planeMoveAmmount;
        });
        document.querySelector("#up").addEventListener("touchend", () => {
            planePos.y = 0;
        });
        document.querySelector("#down").addEventListener("touchstart", () => {
            planePos.y = planeMoveAmmount * -1;
        });
        document.querySelector("#down").addEventListener("touchend", () => {
            planePos.y = 0;
        });
        document.querySelector("#right").addEventListener("touchstart", () => {
            planePos.x = planeMoveAmmount *-1;
        });
        document.querySelector("#right").addEventListener("touchend", () => {
            planePos.x = 0;
        });
        document.querySelector("#left").addEventListener("touchstart", () => {
            planePos.x = planeMoveAmmount;
        });
        document.querySelector("#left").addEventListener("touchend", () => {
            planePos.x = 0;
        });
    }

    window.addEventListener("resize", onWindowResize, false);
    // document.body.appendChild(arButton);

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

    // creating hemisphere light
    hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, .7);
    hemisphereLight.position.set(0.5, 1, 0.25);
    scene.add(hemisphereLight);

    // creating a spotlight that casts shadows
    spotLight = new THREE.SpotLight(0xffa95c, 4);
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.0001;
    spotLight.shadow.mapSize.width = 1024 * 4;
    spotLight.shadow.mapSize.height = 1024 * 4;
    scene.add(spotLight);

    projectorSpotLight = new THREE.SpotLight(0xffa95c, 25);
    projectorSpotLight.castShadow = true;
    projectorSpotLight.shadow.bias = -0.0001;
    projectorSpotLight.shadow.mapSize.width = 1024 * 4;
    projectorSpotLight.shadow.mapSize.height = 1024 * 4;
    projectorSpotLight.map = videoTexture;
    projectorSpotLight.angle = 0.174533;
    projectorSpotLight.visible = false;
    scene.add(projectorSpotLight);




    spotLightHelper = new THREE.SpotLightHelper( spotLight );
    // scene.add( spotLightHelper );

}


function loadProjectorTexture(){
    const video = document.getElementById( 'video' );
    videoTexture = new THREE.VideoTexture( video );
}



function flightComplete() {
    document.getElementById( 'video' ).play();
    projectorSpotLight.visible = true;


    flightCompleted = true;
    const clouds = terrain.getObjectByName('clouds');
    clouds.visible = false;
    document.querySelector("#up").style.display = "none";
    document.querySelector("#down").style.display = "none";
    document.querySelector("#left").style.display = "none";
    document.querySelector("#right").style.display = "none";
    
    terrain.traverse((node) => {
        if (node.isMesh) {
            if (node.name == "Terrain") {
                node.material.map = null;
                node.material.needsUpdate = true;
            }
        }
    });
    new TWEEN.Tween(smallerScene.position).to({x: terrain.position.x, y: terrain.position.y + .5,z:  terrain.position.z}, 3000).easing(TWEEN.Easing.Quadratic.InOut).start();
    new TWEEN.Tween(model.scale).to({x: .1,y: .1,z: .1}, 3000).easing(TWEEN.Easing.Quadratic.InOut).start();
    new TWEEN.Tween(hemisphereLight).to({intensity: 0.000},500).easing(TWEEN.Easing.Quadratic.InOut).start();
    new TWEEN.Tween(spotLight).to({intensity: 0.000},500).easing(TWEEN.Easing.Quadratic.InOut).start();
    // new TWEEN.Tween(projectorSpotLight).to({intensity: 25},600).easing(TWEEN.Easing.Quadratic.InOut).start();
    console.log('Flight Complete');

}

function handleAnimComplete(anim) {
    if (anim.action._clip.name == "placerCubeAction") {
        flightComplete();
    } else {
        // console.log("animation " + anim.action._clip.name + " is Complete")
    }
}

/*
  Function: loadTerrain
  Description: 
    Loads the model of the terrain. 
    Ensures that each node casts and recieves shadows. 
    Adds the model to the scene. 
    Loads the animation. 
  Parameters: None
*/
function loadTerrain() {
    const progressBar = document.getElementById("myBar");
    const reticleURL = "./gltf/reticle.glb"
    loader = new THREE.GLTFLoader();
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('../lib/draco/');
    loader.setDRACOLoader(dracoLoader)
    const modelUrl = "./gltf/terrain.glb"
    document.querySelector("#myBar").style.display = "block";
    document.querySelector("#myProgress").style.display = "block";

    loader.load(reticleURL,
        function(gltf) {
            reticle = gltf.scene;
            reticle.matrixAutoUpdate = false; //stops 3js from moving the reticle
            reticle.visible = false;
            scene.add(reticle);
        },
        function(xhr) {
            progressBar.style.width = (Math.round(xhr.loaded / xhr.total * 100)) + "%";
            progressBar.innerHTML = (Math.round(xhr.loaded / xhr.total * 100)) + "% 1/3";
            if ((xhr.loaded / xhr.total * 100) === 100) {


            }
        },
        // onError callback
        function(error) {
            console.error(error);
        }
    );

    loader.load(modelUrl,
        function(gltf) {
            gltf.scene.traverse(function(node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            terrain = gltf.scene;
            gltfTerrain = gltf;
            terrainLoaderCallback();
            console.log('successfully loaded ' + modelUrl);
        },
        function(xhr) {

            // console.log(xhr.loaded / xhr.total * 100);

            progressBar.style.width = (xhr.loaded / xhr.total * 100)+ "%";
            progressBar.innerHTML = (Math.round(xhr.loaded / xhr.total * 100)) + "% 2/3";
            if ((xhr.loaded / xhr.total * 100) === 100) {
                // document.body.appendChild(arButton);

            }
        },
        // onError callback
        function(error) {
            console.error(error);
        }
    );




}
function terrainLoaderCallback() {
    const movingAnimKey = 1;

    placerCube = terrain.getObjectByName('placerCube');
    // terrain.scale.set(5, 5, 5);
    terrain.position.set(0, -0.5, -1);
    terrain.visible = false;
    placerCube.visible = false;
    scene.add(terrain);

    smallerScene.position.copy(placerCube.position);

    mixer = new THREE.AnimationMixer(terrain);
    movingAnimation = mixer.clipAction(gltfTerrain.animations[movingAnimKey]);
    movingAnimation.clampWhenFinished = true;
    movingAnimation.setLoop(THREE.LoopOnce);
    // console.log(gltfTerrain);

    //add text emptys to array
    const myRegEx = new RegExp("[a-zA-Z]extEmpty+[0-9]{3}");
    gltfTerrain.scene.children.forEach( mesh => {
        if (myRegEx.test(mesh.name)) {
            // console.log(mesh.name);
            const placerObj = new THREE.Object3D();
            placerObj.name =  mesh.name + "placerObj";
            placerObj.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
            placerObj.rotation.set(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z);
            terrain.add(placerObj);
            textEmptys.push([mesh, placerObj]);
        }
    });


    mixer.addEventListener( 'finished', function( e ) {
        handleAnimComplete(e);
    } );

    const worldAnimKeys = [...Array(gltfTerrain.animations.length).keys()];
    worldAnimKeys.splice(movingAnimKey, 1);

    worldAnimKeys.forEach(key => {
        const anim = mixer.clipAction(gltfTerrain.animations[key]);
        anim.clampWhenFinished = true;
        anim.setLoop(THREE.LoopOnce);
        worldAnims.push(anim);
    })
    loadModel();
    // console.log(worldAnims);
}

/*
  Function: loadModel
  Description: 
    Loads the model of the plane. 
    Ensures that each node casts and recieves shadows. 
    Adds the model to the embedded scene. 
  Parameters: None
*/
function loadModel() {
    const progressBar = document.getElementById("myBar");
    loader = new THREE.GLTFLoader();
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('../lib/draco/');
    loader.setDRACOLoader(dracoLoader)

    document.querySelector("#myBar").style.display = "block";
    document.querySelector("#myProgress").style.display = "block";
    const modelUrl = "./gltf/a52.glb";

    loader.load(modelUrl,
        function(gltf) {
            gltf.scene.traverse(function(node) {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            model = gltf.scene;
            modelGltf = gltf;
            model.scale.set(0.01, 0.01, 0.01);
            model.visible = false;
            smallerScene.add(model);
            modelLoaderCallback();
            console.log('successfully loaded ' + modelUrl);
        },
        function(xhr) {

            // console.log(xhr.loaded / xhr.total * 100);

            progressBar.style.width = (xhr.loaded / xhr.total * 100)+ "%";
            progressBar.innerHTML = (Math.round(xhr.loaded / xhr.total * 100)) + "% 3/3";
            if ((xhr.loaded / xhr.total * 100) === 100) {
                document.querySelector("#myBar").style.display = "none";
                document.querySelector("#myProgress").style.display = "none";
                document.body.appendChild(arButton);

            }
        },
        // onError callback
        function(error) {
            console.error(error);
        }
    );


}

function modelLoaderCallback() {
    modelMixer = new THREE.AnimationMixer(model);
    // console.log(modelGltf.animations);

    const modelAnimKeys = [12,13];

    modelAnimKeys.forEach(key => {
        const anim = modelMixer.clipAction(modelGltf.animations[key]);
        modelAnims.push(anim);
    })
    // console.log(modelAnims);
}

/***************************************Functions Called with onSelect*******************************************/

/*
  Function: onSelect
  Description: 
    Runs when the screne is tapped. 
    If the model is visible, the terrain and the smallerScene will be moved to the location of the reticle.
    The terrain will become visible and a start button will appear overlayed on screen. 
  Parameters: None

*/
function onSelect() {
    if (reticle.visible && !scenePlaced) {

        terrain.position.setFromMatrixPosition(reticle.matrix);
        terrain.quaternion.setFromRotationMatrix(reticle.matrix);
        terrain.visible = true;

        smallerScene.position.setFromMatrixPosition(reticle.matrix);
        smallerScene.quaternion.setFromRotationMatrix(reticle.matrix);

        // start button become visible
        document.querySelector("#start").style.display = "block";
        spotLight.position.set( terrain.position.x+.5, terrain.position.y+3, terrain.position.z+.5);
        spotLight.target = terrain;

        const projectorPlacer = new THREE.Object3D();
        terrain.add(projectorPlacer);
        projectorPlacer.translateY(22);
        projectorPlacer.translateZ(0.001);
        const projVect = new THREE.Vector3();
        projectorPlacer.getWorldPosition(projVect);
        // console.log(projVect);


        projectorSpotLight.position.set( projVect.x, projVect.y, projVect.z);
        // projectorSpotLight.rotation.set(terrain.rotation.x, terrain.rotation.y, terrain.rotation.z);
        projectorSpotLight.target = terrain;
        // videoTexture.rotation = terrain.rotation.y;
        // videoTexture.updateMatrix();
        // reticle is removed from the scene
        scenePlaced = true;
        reticle.visible = false;
        scene.remove(reticle);

    }

}

/*********************************************Functions For Buttons*********************************************/

/*
    Function: startAR
    Description: 
        Called when the start button is clicked. 
        Makes the plane model visibles and begins to play the moving animation. 
        Makes the directional buttons visible. 
        Hides the start button. 
    Parameters: None
*/
function startAR() {
    started = true;
    model.visible = true;
    addModelBoundingBox(); 
    movingAnimation.play();
    worldAnims.forEach(anim => {
        anim.play();
    });
    modelAnims.forEach(anim => {
        anim.play();
    });

    // directional buttons become visible
    document.querySelector("#up").style.display = "block";
    document.querySelector("#down").style.display = "block";
    document.querySelector("#left").style.display = "block";
    document.querySelector("#right").style.display = "block";

    // hides the start button
    document.querySelector("#start").style.display = "None";

}

/*
  Function: addModelBoundingBox
  Description: 
    Creates a bounding box for the plane model. 
  Parameters: None
*/
function addModelBoundingBox() {
    modelBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), new THREE.MeshBasicMaterial());
    mesh.position.copy(model.position);
    //smallerScene.add(mesh); 
    modelBB.setFromObject(mesh);
}


/**************************************************************************************************************/

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {
    renderer.setAnimationLoop(render);
    // requestAnimationFrame( animate );
    // render();
}

let hitTestSource = null;
let localSpace = null;
let hitTestSourceInitialized = false;
let planeCreated = false;

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


            if (hitTestResults.length > 0 && !started) {
                document.getElementById("instructions").textContent = "";
                const hit = hitTestResults[0];

                const pose = hit.getPose(localSpace);

                reticle.visible = true;

                reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                reticle.visible = false;
            }
        }

        if (model.visible) {
            TWEEN.update();
            if (!flightCompleted) {
            // getting the position of the cube, unsure if simplifying it will effect the tweens
                let cubePos = new THREE.Vector3();
                cubePos.setFromMatrixPosition(placerCube.matrixWorld);
                let cubePosCoords = { x: cubePos.x, y: cubePos.y, z: cubePos.z };
    
                // This line of code must be before the actual Tweens in the renderer
                
    
                // moving the model towards the cube
                new TWEEN.Tween(smallerScene.position).to(cubePosCoords, 10).easing(TWEEN.Easing.Quadratic.InOut).start();
    
    
                //move the plane up and down
                //calc angle of plane based on trajectory point being z+ a and pos from planePos
                const a = .15;
    
                //solve for x
                const bx = planePos.y - model.position.y;
                const cx = Math.sqrt(Math.pow(a, 2) + Math.pow(bx , 2));
                const bbx = Math.asin(bx/cx);
    
                //solve for y
                const by = planePos.x - model.position.x;
                const cy = Math.sqrt(Math.pow(a, 2) + Math.pow(by , 2));
                const bby = Math.asin(by/cy);
    
                new TWEEN.Tween(model.rotation).to({x: bbx*-1, y: bby, z: bby*-1}, 250).easing(TWEEN.Easing.Quadratic.InOut).start();
                
                new TWEEN.Tween(model.position).to(planePos, 500).easing(TWEEN.Easing.Quadratic.InOut).start();
                
    
    
                
    
    
                let time = { t: 0 };
                let start = smallerScene.quaternion.clone();
                smallerScene.lookAt(cubePos);
                let end = smallerScene.quaternion.clone();
                smallerScene.quaternion.copy(start);
    
    
                // turning the model towards the box
                new TWEEN.Tween(time).to({ t: 1 }, 150).onUpdate(() => {
                    smallerScene.quaternion.slerpQuaternions(start, end, time.t);
                }).easing(TWEEN.Easing.Quadratic.InOut).start();

            } else {
                // videoTexture.rotation += 0.02;
                smallerScene.rotation.y += 0.02;
            };
            
            // gltfTerrain.scene.children.forEach( mesh => {
            //     if (myRegEx.test(mesh.name)) {
            //         mesh.rotation.y = Math.atan2( ( camera.position.x - mesh.position.x ), ( camera.position.z - mesh.position.z ) );
            //     }
            // });
            textEmptys.forEach(textMt => {
                textMt[1].lookAt(camera.position);
                textMt[0].rotation.y = textMt[1].rotation.y;
            })

            

            // updates the position of the bounding box for the model
            // modelBB.applyMatrix4(model.matrixWorld);

            // checks where the model is intersecting the terrain
            // checkBoxCollisions();

            let deltaTime = clock.getDelta();

            // updating the animations
            if (mixer) {
                mixer.update(deltaTime);
            }
            if (modelMixer) {
                modelMixer.update(deltaTime);
            }
        }
        // videoTexture.update();
        renderer.render(scene, camera);
        spotLightHelper.update();

    }
}

function checkBoxCollisions() {
    // commented out code is just changing the color of the terrain
    // might be able to use this with bounding boxes to gradually change the color of the terrain
    terrain.traverse((node) => {
        // console.log(node); 
        if (node.isMesh) {
            let nodeBB = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
            nodeBB.setFromObject(node);
            if (nodeBB.intersectsBox(modelBB)) {
                node.material.color.set(0xff0000);
            }
        }
    });
}