export function makeGltfMask(mask) {
  console.log("updating material");
  if (mask.material) {
    const newMaterial = new THREE.MeshBasicMaterial({colorWrite: false});
    mask.material = newMaterial;
  }
  if (!mask.children) {
    return;
  }
  for (let i = 0; i < mask.children.length; i++) {
    makeGltfMask(mask.children[i]);
  }
}

export async function loadGltf(modelUrl) {
	const loader = new THREE.GLTFLoader(); 
	const gltf = await loader.loadAsync(modelUrl);
	const object3d = gltf.scene;
  return object3d;
}

export async function getImageBitmap(imageUrl) {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);
  return imageBitmap;
};