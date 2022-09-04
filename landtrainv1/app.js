
      import { ARButton } from 'https://unpkg.com/three@0.126.0/examples/jsm/webxr/ARButton.js';
      // import { DRACOLoader } from './libs/DRACOLoader.js';


			let camera, scene, renderer;
    	let loader;
      let reticle;
      let controller;
      let ship;
      let mask;
      let pane;
      let loadingPane;
      var object3D = null;


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

        

        const button = ARButton.createButton(renderer, {requiredFeatures: ["hit-test"]});
        document.body.appendChild(button);

        window.addEventListener('resize', onWindowResize, false);
			}


      async function addShipToScene() {

        const shipUrl = "landtrain.glb";

        // const loader = new THREE.GLTFLoader();
        const dracoLoader = new THREE.DRACOLoader();

        dracoLoader.setDecoderPath('./libs/draco/gltf/');

        const loader = new THREE.GLTFLoader()
        loader.setDRACOLoader(dracoLoader)


        // loader.setDRACOLoader(dracoLoader);

        // load the ship
        loader.load(shipUrl,
          function (gltf) {
            ship = gltf.scene;
            ship.visible = false;
            scene.add(ship);
          },
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
        if (reticle.visible && ship && !spawned) {
          ship.visible = true;
          ship.position.setFromMatrixPosition(reticle.matrix); 
          ship.quaternion.setFromRotationMatrix(reticle.matrix);
          ship.translateY(0);   
          spawned = true;
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
          if (!spawned){
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

              } else {
                reticle.visible = false;
              }
            }          
          } else {
            reticle.visible = false;
          }
				  renderer.render(scene, camera);
    		}
      }