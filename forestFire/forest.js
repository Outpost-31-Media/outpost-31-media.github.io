export class Forest {
	constructor(height, width, scene, orgin) {
		this.height = height;
		this.width = width;
		this.scene = scene;
		this.trees = this.build();
		this.radius = [height/2, width/2];
		this.orgin = orgin;
	}

	build() {
		this.trees = []
		for (let h = 0; h < this.height; h++) {
			this.trees.push([]);
   			for (let w = 0; w < this.width; w++) {
				this.trees[h][w] = new Tree([h,w], this.scene, this.radius, this.orgin);
   			}
		}
		return this.trees;
	}


	findTree(cor) {
		return this.trees[cor[0]][cor[1]]
	}
}

class Tree {
	constructor(cor, scene, radius, orgin) {
		this.cor = cor;
		this.state = 0;
		this.object3D = this.build();
		this.scene = scene;
		this.radius = radius;
		this.orgin = orgin;
	}
	build() {
		return "object3D";
	}
	light() {
		this.state=1;
	}
	extinguish(){
		this.state=2;
	}

}