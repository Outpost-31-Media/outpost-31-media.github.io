import { loadGLTF } from '../lib/loader.js';
const THREE = window.MINDAR.FACE.THREE;

let count = 1;

document.addEventListener('DOMContentLoaded', () => {
    async function init() {

        const mindarThree = new window.MINDAR.FACE.MindARThree({
            container: document.body,
        });

        const { renderer, scene, camera } = mindarThree;

        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        scene.add(light);

        // loading the model of the bird flying 
        const flyModel = await loadGLTF("../assets/justBird.glb");
        flyModel.scene.position.set(0, -0.5, -0.1);
        flyModel.scene.scale.set(0.009, 0.009, 0.009);

        // loading the static model
        const testModel = await loadGLTF("../assets/newbird.glb");
        testModel.scene.position.set(0, 0.25, 0);
        testModel.scene.scale.set(0.009, 0.009, 0.009);

        // anchoring models to the user's forehead
        const anchor = mindarThree.addAnchor(10);
        anchor.group.add(flyModel.scene);

        // playing the animation of the bird flying
        const flyMixer = new THREE.AnimationMixer(flyModel.scene);
        const flyAction = flyMixer.clipAction(flyModel.animations[0]);
        flyAction.setLoop(THREE.LoopOnce);
        flyAction.clampWhenFinished = true;
        flyAction.play();

        // getting the wings flapping and the head moving animations
        const mixer = new THREE.AnimationMixer(testModel.scene);
        const headAction = mixer.clipAction(testModel.animations[0]);
        const wingAction = mixer.clipAction(testModel.animations[1]);
        wingAction.setLoop(THREE.LoopOnce);
        headAction.setLoop(THREE.LoopOnce);
        wingAction.timeScale = 2;
        headAction.timeScale = 2;

        // when the fly animation is done, the static model replaces the flying model
        flyMixer.addEventListener('finished', () => {
            anchor.group.add(testModel.scene);
            anchor.group.remove(flyModel.scene);
            wingAction.play();
        });

        // plays the wing animation then the head animation 
        mixer.addEventListener('finished', () => {
            if (count % 2 != 0) {
                headAction.play();
                wingAction.stop();
            } else {
                headAction.stop()
                wingAction.play();
            }
            count++;

        })

        document.querySelector("#photo").addEventListener("click", () => {
            takePhoto(mindarThree);
        });

        document.querySelector("#switch_camera").addEventListener("click", () => {
            mindarThree.switchCamera();
        });

        // runs the animations
        const clock = new THREE.Clock();
        await mindarThree.start();
        renderer.setAnimationLoop(() => {
            const delta = clock.getDelta();
            mixer.update(delta);
            flyMixer.update(delta);
            renderer.render(scene, camera);
        }

        )
    };

    init();
});

/* 
    Function: takePhoto
    Description: 
        When the Photo button is clicked, a photo of the user is taken as a jpeg. 
    Parameters: mindarThree
*/
function takePhoto(mindarThree) {
    const { video, renderer, scene, camera } = mindarThree;
    const renderCanvas = renderer.domElement;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = renderCanvas.width;
    canvas.height = renderCanvas.height;

    const sx = (video.clientWidth - renderCanvas.clientWidth) / 2 * video.videoWidth / video.clientWidth;
    const sy = (video.clientHeight - renderCanvas.clientHeight) / 2 * video.videoHeight / video.clientHeight;
    const sw = video.videoWidth - sx * 2;
    const sh = video.videoHeight - sy * 2;

    context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    renderer.preserveDrawingBuffer = true;
    renderer.render(scene, camera);
    context.drawImage(renderCanvas, 0, 0, canvas.width, canvas.height);
    renderer.preserveDrawingBuffer = false;

    const link = document.createElement("a");
    link.download = "outpost31.jpeg";
    link.href = canvas.toDataURL("image/jpeg");
    link.click();
}