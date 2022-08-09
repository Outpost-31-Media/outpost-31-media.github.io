import {loadGLTF, loadTexture, loadTextures, loadVideo} from '../helper/loader.js';
const THREE = window.MINDAR.IMAGE.THREE;

document.addEventListener('DOMContentLoaded', () => {
  async function init() {
    //mockWithVideo('../../assets/mock-videos/musicband1.mp4');

    const mindarThree = new window.MINDAR.IMAGE.MindARThree({
      container: document.body,
      imageTargetSrc: '../target/cat.mind',
    });
    const {renderer, scene, camera} = mindarThree;

    const light = new THREE.HemisphereLight( 0xffffff, 0xbbbbff, 1 );
    scene.add(light);

    // getting chair gltf model
    const chair = await loadGLTF('../assets/chair/scene.gltf');
    chair.scene.scale.set(0.2, 0.2, 0.2);
    chair.scene.position.set(0, -0.3, 0.3);

    // getting video
    const video = await loadVideo("../assets/movie.mp4"); 
    const videoTexture = new THREE.VideoTexture(video); 
    const videoGeometry = new THREE.PlaneGeometry(1, 480/852); 
    const videoMaterial = new THREE.MeshBasicMaterial({map: videoTexture}); 
    const videoPlane = new THREE.Mesh(videoGeometry,videoMaterial);  

    // video will always start at the beginning
    video.addEventListener("play", () => {
        video.currentTime = 0; 
    }); 

    // getting fox model
    const fox = await loadGLTF('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF/Fox.gltf');
    fox.scene.scale.multiplyScalar(0.01);
    fox.scene.position.set(0, -0.3, 0.3);

    // getting image
    const imageTexture = await loadTexture("../assets/tree.jpg"); 
    const imageGeometry = new THREE.PlaneGeometry(1, 480/771); 
    const imageMaterial = new THREE.MeshBasicMaterial({map: imageTexture}); 
    const image = new THREE.Mesh(imageGeometry, imageMaterial); 

    //const text = new THREE.TextGeometry(); 

    // making the arrows
    const arrowGeometry = new THREE.CircleGeometry(0.075, 32 )
    const arrowMaterial = new THREE.MeshBasicMaterial({color: "#0000FF"}); 
    const leftArrow = new THREE.Mesh(arrowGeometry, arrowMaterial); 
    const rightArrow = new THREE.Mesh(arrowGeometry, arrowMaterial); 
    leftArrow.position.set(-0.5, 0, 0.15); 
    rightArrow.position.set(0.5, 0, 0.15);
    leftArrow.userData.clickable = true; 
    rightArrow.userData.clickable = true; 

    // anchors the models to the image
    const anchor = mindarThree.addAnchor(0);
    anchor.group.add(chair.scene);
    anchor.group.add(leftArrow); 
    anchor.group.add(rightArrow); 

    const displayItems = [chair, video, fox, image];
    let currentItem = 0;

    // tracking mouse clicks
    document.body.addEventListener('click', (e) => {

        const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        const mouse = new THREE.Vector2(mouseX, mouseY);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
            let obj = intersects[0].object; 
            while (obj.parent && !obj.userData.clickable) {
                obj = obj.parent; 
            }

            // runs if the object clicked is one of the arrows
            if (obj.userData.clickable) {

                // If the object clicked is the leftArrow, currentItem is decreased. 
                if (obj === leftArrow) {
                    if (currentItem !== 0) {
                        currentItem -= 1; 
                    } else {
                        currentItem = displayItems.length - 1; 
                    }

                // If the object clicked is the rightArrow, currentItem is increased   
                } else {
                    if (currentItem !== displayItems.length - 1) {
                        currentItem += 1; 
                    } else {
                        currentItem = 0; 
                    }
                }

                // sets the chair as the displayed item
                if (displayItems[currentItem] === chair) {
                    anchor.group.add(chair.scene); 
                    anchor.group.remove(videoPlane); 
                    anchor.group.remove(fox.scene); 
                    anchor.group.remove(image); 
                    video.pause(); 

                // sets the video as the current item
                } else if (displayItems[currentItem] === video) {
                    anchor.group.remove(chair.scene); 
                    anchor.group.add(videoPlane);
                    anchor.group.remove(fox.scene); 
                    anchor.group.remove(image); 
                    video.play();

                // sets the fox as the current item
                } else if (displayItems[currentItem] === fox) {
                    anchor.group.remove(chair.scene); 
                    anchor.group.remove(videoPlane);
                    anchor.group.add(fox.scene); 
                    anchor.group.remove(image); 
                    video.pause();
                    
                // sets the image as the current item
                } else if (displayItems[currentItem] === image) {
                    anchor.group.remove(chair.scene); 
                    anchor.group.remove(videoPlane);
                    anchor.group.remove(fox.scene); 
                    anchor.group.add(image); 
                    video.pause();
                }
            }
        }

    });

    await mindarThree.start();
    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
    });
  }
  init();
});

