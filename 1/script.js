'use strict';

import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

class ThreeApp {
	static CAMERA_PARAM = {
		fovy: 60,
		aspect: window.innerWidth / window.innerHeight,
		near: 0.1,
		far: 200.0,
		position: new THREE.Vector3(0.0, 2.0, 50.0),
		lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
	};

	static RENDERER_PARAM = {
		clearColor: 0x000000,
		width: window.innerWidth,
		height: window.innerHeight,
	};

	static DIRECTIONAL_LIGHT_PARAM = {
		color: 0xffffff,
		intensity: 1.0,
		position: new THREE.Vector3(1.0, 1.0, 1.0),
	};

	static AMBIENT_LIGHT_PARAM = {
		color: 0xffffff,
		intensity: 0.1,
	};

	static MATERIAL_PARAM = {
		color: 0xFFFF00,
	};

	static BOX_CONFIG = {
		rows: 21,
		diameter: 20,
	};

	renderer;
	scene;
	camera;
	directionalLight;
	ambientLight;
	material;
	geometory;
	boxArray;
	controls;
	axesHelper;
	move;

	constructor(wrapper){
		// renderer
		const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setClearColor(color);
		this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
		wrapper.appendChild(this.renderer.domElement);

		// scene
		this.scene = new THREE.Scene();

		// camera
		this.camera = new THREE.PerspectiveCamera(
			ThreeApp.CAMERA_PARAM.fovy,
			ThreeApp.CAMERA_PARAM.aspect,
			ThreeApp.CAMERA_PARAM.near,
			ThreeApp.CAMERA_PARAM.far,
		);
		this.camera.position.copy(ThreeApp.CAMERA_PARAM.position);
		this.camera.lookAt(ThreeApp.CAMERA_PARAM.lookAt);

		// directional light
		this.directionalLight = new THREE.DirectionalLight(
			ThreeApp.DIRECTIONAL_LIGHT_PARAM.color,
			ThreeApp.DIRECTIONAL_LIGHT_PARAM.intensity,
		);
		this.directionalLight.position.copy(ThreeApp.DIRECTIONAL_LIGHT_PARAM.position);
		this.scene.add(this.directionalLight);

		// ambient light
		this.ambientLight = new THREE.AmbientLight(
			ThreeApp.AMBIENT_LIGHT_PARAM.color,
			ThreeApp.AMBIENT_LIGHT_PARAM.intensity,
		);
		this.scene.add(this.ambientLight);

		// material
		this.material = new THREE.MeshPhongMaterial(ThreeApp.MATERIAL_PARAM);

		// geometory
		this.geometory = new THREE.BoxGeometry(1, 1, 1);

		// mesh
		this.boxArray = [];
		this.move = 0;
		let count = 0;
		for( let i=0;i<ThreeApp.BOX_CONFIG.rows;i++ ) {
			const x = ThreeApp.BOX_CONFIG.diameter * Math.cos((90 - i * 180 / (ThreeApp.BOX_CONFIG.rows - 1)) * Math.PI / 180) + 2;
			const y = ThreeApp.BOX_CONFIG.diameter * Math.sin((90 - i * 180 / (ThreeApp.BOX_CONFIG.rows - 1)) * Math.PI / 180);
			const diameter = x * 2 * Math.PI;
			const rowCount = Math.ceil(diameter / 2);
			const rad = 360 / rowCount;
			let rowArray = [];
			for( let j=0;j<rowCount;j++ ) {
				const box = new THREE.Mesh(this.geometory, this.material);
				const boxData = {
					geometory: box,
					x: x,
					y: y,
					rad: rad,
					row: i,
					index: j,
				};
				this.setPosition(boxData);
				this.scene.add(box);
				count++;
				this.boxArray.push(boxData);
			}
		}
		// console.log(count);

		// axes
		// const axesBarLength = 5.0;
    // this.axesHelper = new THREE.AxesHelper(axesBarLength);
    // this.scene.add(this.axesHelper);

		// control
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);

		// bind
		this.render = this.render.bind(this);

		// resize
		window.addEventListener('resize', ()=>{
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
		}, false);
	}

	setPosition(data){
		const direction = ( data.row % 2 == 0 )? this.move : this.move * -1;
		const rad = data.index * data.rad * Math.PI / 180 + direction / data.x * 0.02;
		data.geometory.position.x = data.x * Math.sin(rad);
		data.geometory.position.y = data.y;
		data.geometory.position.z = data.x * Math.cos(rad);
		data.geometory.rotation.y = rad;
	}

	render(){
		requestAnimationFrame(this.render);
		this.controls.update();
		this.move += 1;
		this.boxArray.forEach((data)=>{
			this.setPosition(data);
		});
		this.renderer.render(this.scene, this.camera);
	}
}

(()=>{
	const wrapper = document.querySelector('#webgl');
	const app = new ThreeApp(wrapper);
	app.render();
})();
