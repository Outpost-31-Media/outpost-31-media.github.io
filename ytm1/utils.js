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
  if (gltf.animations.length > 0) {
    return [object3d, gltf.animations];
  } else {
    return object3d;
  }
}

export async function getImageBitmap(imageUrl) {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);
  return imageBitmap;
};


export function getPointInBetweenByPerc(pointA, pointB, percentage) {

    var dir = pointB.clone().sub(pointA);
    var len = dir.length();
    dir = dir.normalize().multiplyScalar(len*percentage);
    return pointA.clone().add(dir);

}

// obj - your object (THREE.Object3D or derived)
// point - the point of rotation (THREE.Vector3)
// axis - the axis of rotation (normalized THREE.Vector3)
// theta - radian value of rotation
// pointIsWorld - boolean indicating the point is in world coordinates (default = false)
export function rotateAboutPoint(obj, point, axis, theta, pointIsWorld){
    console.log('roating');
    pointIsWorld = (pointIsWorld === undefined)? false : pointIsWorld;

    if(pointIsWorld){
        obj.parent.localToWorld(obj.position); // compensate for world coordinate
    }

    obj.position.sub(point); // remove the offset
    obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
    obj.position.add(point); // re-add the offset

    if(pointIsWorld){
        obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
    }

    obj.rotateOnAxis(axis, theta); // rotate the OBJECT
}

export function rotateAroundPoint(point, object, rotateXrad, rotateYrad, rotateZrad) {
  let moveDir = new THREE.Vector3(
    point.x - object.position.x,
    point.y - object.position.y,
    point.z - object.position.z
  );
  moveDir.normalize();
  let moveDist = object.position.distanceTo(point);
  object.translateOnAxis(moveDir, moveDist);
  /// step 3: rotate camera
  object.rotateX(rotateXrad);
  object.rotateY(rotateYrad);
  object.rotateZ(rotateZrad);
  /// step4: move camera along the opposite direction
  moveDir.multiplyScalar(-1);
  object.translateOnAxis(moveDir, moveDist);
}