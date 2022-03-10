import ThreeMeshUI from 'https://cdn.skypack.dev/three-mesh-ui';
      import { ARButton } from 'https://unpkg.com/three@0.126.0/examples/jsm/webxr/ARButton.js';


			let camera, scene, renderer;
    	let loader;
      let reticle;
      let controller;
      let ship;
      let mask;
      let pane;
      let loadingPane;
      let uiContainer;
      let uiText;
      var object3D = null;
      let uiMoved = 0;

      const PARAMS = {
       loaded: '0'

      }




      setupGui();
      init();
			animate();


      function setupGui() {
        pane = new Tweakpane.Pane({
          title: 'AR @ Outpost31',
        });
        pane.containerElem_.style.zIndex = "10";
        loadingPane = pane.addMonitor(PARAMS, 'loaded', {
          label: 'Model',
          multiline: false
        });
      }

			function init() {
				const container = document.createElement('div');
				document.body.appendChild(container);
	
				scene = new THREE.Scene();
	
				camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);
	
				renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
				renderer.setPixelRatio(window.devicePixelRatio);
				renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
				container.appendChild(renderer.domElement);
	
				//light
				var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
				light.position.set(0.5, 1, 0.25);
				scene.add(light);
	
        controller = renderer.xr.getController(0);
        controller.addEventListener('select', onSelect);
        scene.add(controller);
	       
         
				addReticleToScene();
        addShipToScene();
        addUiToScene();
        

        const button = ARButton.createButton(renderer, {requiredFeatures: ["hit-test"]});
        document.body.appendChild(button);

        window.addEventListener('resize', onWindowResize, false);
			}
      function addUiToScene() {
        console.log('setting up ui');
        uiContainer = new ThreeMeshUI.Block({
         width: .7,
         height: 0.4,
         padding: 0.01,
         fontFamily: './assets/Roboto-msdf.json',
         fontTexture: './assets/Roboto-msdf.png',
        });
        
        
        
        uiText = new ThreeMeshUI.Text({
         content: "Move your phone to let it find the floor."
        });

        
        uiContainer.position.set( 0, 0, -1 );
        uiContainer.rotation.x = -0.3;
        scene.add( uiContainer );
        uiContainer.add( uiText );
        console.log( uiContainer );
        // scene is a THREE.Scene (see three.js)

      }

      function reticleUi () {
        uiMoved = 1;
        uiContainer.position.setFromMatrixPosition(reticle.matrix); 
        uiContainer.quaternion.setFromRotationMatrix(reticle.matrix);
        uiContainer.translateZ(-1);
        uiContainer.translateY(.4);
        uiText.set({ 
          content: 'Line up your reticle where you want to place a tree and tap your screen to continue.'
        });
      }

      function modelUi() {
        uiMoved = 2;
        uiContainer.position.setFromMatrixPosition(reticle.matrix); 
        uiContainer.quaternion.setFromRotationMatrix(reticle.matrix);
        uiContainer.translateZ(-1);
        uiContainer.translateY(1);
        uiText.set({ content: 'this is a tree'});

      }

      async function addShipToScene() {

        const shipUrl = "tree.glb";

        const loader = new THREE.GLTFLoader();

        // load the ship
        const gltf = await loader.loadAsync(shipUrl,
          function (xhr) {
            PARAMS['loaded']=((Math.round(xhr.loaded / xhr.total * 100)) + '% loaded' );
            if ((xhr.loaded / xhr.total * 100) === 100) {
              pane.dispose();
            }
          },
          // onError callback
          function (error) {
            console.error(error);
          }
        );
        ship = gltf.scene;
        ship.scale.multiplyScalar(.5);
        ship.visible = false; 
        scene.add(ship);
      }


      function addReticleToScene() {
        const geometry = new THREE.RingBufferGeometry(0.15, 0.2, 31).rotateX(-Math.PI/2); //draws ring
        const material = new THREE.MeshBasicMaterial();

        reticle = new THREE.Mesh(geometry, material);

        reticle.matrixAutoUpdate = false; //stops 3js from moving the reticle
        reticle.visible = false;
        scene.add(reticle);
      }

      function onSelect() {
        console.log("tap");
        if (reticle.visible) {
          const clone = ship.clone();
          clone.position.setFromMatrixPosition(reticle.matrix); 
          clone.quaternion.setFromRotationMatrix(reticle.matrix);
          clone.translateY(-.01); 
          clone.visible = true;
          scene.add(clone);
          
          modelUi();
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
      let spawned = false;


      async function initializeHitTestSource() {
        const session = renderer.xr.getSession();
        const viewerSpace = await session.requestReferenceSpace("viewer");//get viewer space basically orgin of the phone that always moves with phone
        hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
        console.log(hitTestSource);
        localSpace = await session.requestReferenceSpace("local");
        console.log(localSpace);
        hitTestSourceInitialized = true;

       
        session.addEventListener("end", () => {
          hitTestSourceInitialized = false;
          hitTestSource = null;
        });
      }

	

			function render(timestamp, frame) {
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
              reticle.visible = true;
  
              reticle.matrix.fromArray(pose.transform.matrix);
              if (uiMoved === 0) {
                reticleUi();
              }
            } else {
              reticle.visible = false;
            }
          }          
          uiContainer.lookAt(camera.position);
          ThreeMeshUI.update();
				  renderer.render(scene, camera);
    		}
      }