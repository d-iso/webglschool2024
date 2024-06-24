'use strict';

import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

class ThreeApp {
	static CAMERA_PARAM = {
		fovy: 40,
		aspect: window.innerWidth / window.innerHeight,
		near: 0.1,
		far: 200.0,
		position: new THREE.Vector3(0.0, 2.0, 120.0),
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
		// intensity: 0.1,
		intensity: 1,
	};

	static EARTH_RADIUS = 50;

	static CITY_DATA = {
		tokyo: {
			label: '東京',
			lat: 35.689,
			lng: 139.692,
		},
		delhi: {
			label: 'デリー',
			lat: 28.704,
			lng: 77.102,
		},
		newyork: {
			label: 'ニューヨーク',
			lat: 40.712,
			lng: -74.005,
		},
		london: {
			label: 'ケープタウン',
			lat: -33.9248,
			lng: 18.424,
		},
	};

	static PLANE_CONFIG = {
		above: 0.1,
		// maxSpeed: 0.01,
		maxSpeed: 0.5,
		turn: 0.05,
	};

	wrapper;
	renderer;
	scene;
	camera;
	directionalLight;
	ambientLight;
	earthTexture;
	cities = {};
	plane;
	target;
	planeDirection;
	prevPlaneDirection;
	prevPlanePosition;
	citiesElement = document.querySelector('.cities');
	controls;
	axesHelper;
	isMove = false;
	speed = 0;
	altitude = 1 + ThreeApp.PLANE_CONFIG.above;

	constructor(wrapper){
		this.wrapper = wrapper;

		// bind
		this.render = this.render.bind(this);

		// resize
		window.addEventListener('resize', ()=>{
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
		}, false);
	}

	async load(){
		const loader = new THREE.TextureLoader();
		const earthTexture = await loader.loadAsync('./earth.jpg');
		this.earthTexture = earthTexture;
	}

	init(){
		// renderer
		const color = new THREE.Color(ThreeApp.RENDERER_PARAM.clearColor);
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setClearColor(color);
		this.renderer.setSize(ThreeApp.RENDERER_PARAM.width, ThreeApp.RENDERER_PARAM.height);
		this.wrapper.appendChild(this.renderer.domElement);

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

		// earth
		const earth = new THREE.Group();
		this.scene.add(earth);

		const earthGeometory = new THREE.SphereGeometry(0.5, 32, 32);
		const earthMaterial = new THREE.MeshPhongMaterial({
			color: 0x00FFFF,
			transparent: true,
			opacity: 0.5,
		});
		// const earthMaterial = new THREE.MeshPhongMaterial({
		// 	color: 0xffffff,
		// 	// transparent: true,
		// 	// opacity: 0.5,
		// });
		// earthMaterial.map = this.earthTexture;
		const earthMesh = new THREE.Mesh(earthGeometory, earthMaterial);
		earth.add(earthMesh);
		earthMesh.scale.setScalar(ThreeApp.EARTH_RADIUS * 2);
		earth.rotation.x = 0.4;
		earth.rotation.y = 2.3;

		// cities
		Object.keys(ThreeApp.CITY_DATA).forEach((city)=>{
			const data = ThreeApp.CITY_DATA[city];
			const latRad = data.lat * Math.PI / 180;
			const lngRad = (360 - data.lng) * Math.PI / 180;
			const geometory = new THREE.SphereGeometry(0.5, 32, 32);
			const material = new THREE.MeshPhongMaterial({
				color: 0xff0000,
			});
			const mesh = new THREE.Mesh(geometory, material);
			earth.add(mesh);
			mesh.position.x = ThreeApp.EARTH_RADIUS * Math.cos(latRad) * Math.cos(lngRad);
			mesh.position.y = ThreeApp.EARTH_RADIUS * Math.sin(latRad);
			mesh.position.z = ThreeApp.EARTH_RADIUS * Math.cos(latRad) * Math.sin(lngRad);
			mesh.scale.setScalar(0.5);
			this.cities[city] = mesh;
			const button = document.createElement('button');
			button.innerText = data.label;
			this.citiesElement.appendChild(button);
			button.addEventListener('click', ()=>{
				this.isMove = true;
				this.target = city;
			}, false);
		});


		// plane
		const planeGeometory = new THREE.ConeGeometry(0.2, 0.5, 32);
		const planeMaterial = new THREE.MeshPhongMaterial({color: 0xff00dd});
		this.plane = new THREE.Mesh(planeGeometory, planeMaterial);
		earth.add(this.plane);
		this.plane.scale.setScalar(5);
		this.plane.position.add(this.cities['tokyo'].position.clone());
		this.plane.position.multiplyScalar(this.altitude);
		// this.planeDirection = this.plane.position.clone().normalize();
		this.prevPlaneDirection = this.plane.position.clone().normalize();
		this.planeDirection = this.cities['newyork'].position.clone().normalize();
		this.prevPlanePosition = this.plane.position.clone();

		// axes
		const axesBarLength = 100.0;
		this.axesHelper = new THREE.AxesHelper(axesBarLength);
		this.scene.add(this.axesHelper);

		// control
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
	}

	move(city){
		const target = this.cities[city];
		console.log(target);
	}

	render(){
		requestAnimationFrame(this.render);
		this.controls.update();
		if( this.target && this.isMove ) {
			// const prevDirection = this.planeDirection.clone();
			// this.speed = ThreeApp.PLANE_CONFIG.maxSpeed / 2;
			// const startVec = this.plane.position.clone();
			// const targetVec = this.cities[this.target].position.clone().multiplyScalar(this.altitude);

			// const idealVec = this.plane.position.clone();
			// const idealAxis = new THREE.Vector3().crossVectors(this.plane.position, targetVec);
			// idealAxis.normalize();
			// const idealQtn = new THREE.Quaternion().setFromAxisAngle(idealAxis, this.speed);
			// idealVec.applyQuaternion(idealQtn);

			// const turnVec = this.plane.position.clone();
			// const turnStAxis = new THREE.Vector3().crossVectors(this.prevPlanePosition, this.plane.position);
			// turnStAxis.normalize();
			// const turnStQtn = new THREE.Quaternion().setFromAxisAngle(turnStAxis, this.speed);
			// this.planeDirection.applyQuaternion(turnStQtn);
			// turnVec.applyQuaternion(turnStQtn);
			// this.planeDirection.normalize();

			// const compareAxis = new THREE.Vector3().crossVectors(turnVec, targetVec);
			// compareAxis.normalize();
			// const compareQtn = new THREE.Quaternion().setFromAxisAngle(idealAxis, this.speed);
			// idealVec.applyQuaternion(idealQtn);


			

			// if(
			// 	Math.round(idealVec.x) == Math.round(turnVec.x)
			// 	&& Math.round(idealVec.y) == Math.round(turnVec.y)
			// 	&& Math.round(idealVec.x) == Math.round(turnVec.x)
			// ) {
			// 	console.log('同じ');
			// } else {
			// 	const turnRoQtn = new THREE.Quaternion().setFromAxisAngle(prevDirection, 0.1);
			// 	this.planeDirection.applyQuaternion(turnRoQtn);
			// 	turnVec.applyQuaternion(turnRoQtn);
			// 	this.planeDirection.normalize();
			// 	const axis = new THREE.Vector3().crossVectors(this.plane.position, this.planeDirection);
			// 	axis.normalize();
			// 	const qtn = new THREE.Quaternion().setFromAxisAngle(axis, this.speed);
			// 	this.plane.position.applyQuaternion(qtn);
			// }




			// const idealVec = this.plane.position.clone();
			// const idealAxis = new THREE.Vector3().crossVectors(this.plane.position, targetVec);
			// idealAxis.normalize();
			// const idealQtn = new THREE.Quaternion().setFromAxisAngle(idealAxis, this.speed);
			// const idealDerection = this.plane.position.clone().applyQuaternion(idealQtn);
			// idealDerection.normalize();
			// idealVec.applyQuaternion(idealQtn);

			// const turnVec = this.plane.position.clone();
			// const turnStAxis = new THREE.Vector3().crossVectors(this.prevPlaneDirection, this.planeDirection);
			// turnStAxis.normalize();
			// const turnStQtn = new THREE.Quaternion().setFromAxisAngle(turnStAxis, this.speed);
			// turnVec.applyQuaternion(turnStQtn);

			// const nextVec = prevDirection.clone();
			// const nextAxis = new THREE.Vector3().crossVectors(startVec, prevDirection);
			// const nextQtn = new THREE.Quaternion().setFromAxisAngle(nextAxis, this.speed);
			// this.planeDirection.applyQuaternion(nextQtn);
			// const turnQtn = new THREE.Quaternion().setFromAxisAngle(prevDirection, 0.1);
			// this.planeDirection.applyQuaternion(turnQtn);
			// this.planeDirection.normalize();
			// console.log(`ideal: ${Math.round(idealVec.x)}, ${Math.round(idealVec.y)}, ${Math.round(idealVec.z)}`, `direction: ${Math.round(turnVec.x)}, ${Math.round(turnVec.y)}, ${Math.round(turnVec.z)}`);
			// if(
			// 	Math.round(idealVec.x) == Math.round(turnVec.x)
			// 	&& Math.round(idealVec.y) == Math.round(turnVec.y)
			// 	&& Math.round(idealVec.x) == Math.round(turnVec.x)
			// ) {
			// 	console.log('同じ');
			// 	this.plane.position.applyQuaternion(idealQtn);
			// } else {
			// 	const turnRoQtn = new THREE.Quaternion().setFromAxisAngle(this.plane.position, 0.05);
			// 	turnVec.applyQuaternion(turnRoQtn);
			// 	const axis = new THREE.Vector3().crossVectors(this.plane.position, turnVec);
			// 	axis.normalize();
			// 	const qtn = new THREE.Quaternion().setFromAxisAngle(axis, this.speed);
			// 	this.plane.position.applyQuaternion(qtn);
			// }
			// const turnRoQtn = new THREE.Quaternion().setFromAxisAngle(this.plane.position, 0.05);
			// 	turnVec.applyQuaternion(turnRoQtn);
			// 	const axis = new THREE.Vector3().crossVectors(this.plane.position, turnVec);
			// 	axis.normalize();
			// 	const qtn = new THREE.Quaternion().setFromAxisAngle(axis, this.speed);
			// 	this.plane.position.applyQuaternion(qtn);
			// this.planeDirection = turnVec.clone().normalize();

			// const axis = new THREE.Vector3().crossVectors(startVec, this.planeDirection);
			// axis.normalize();
			// const qtn = new THREE.Quaternion().setFromAxisAngle(axis, this.speed);
			// this.plane.position.applyQuaternion(qtn);





			// const prevDirection = this.planeDirection.clone();
			// // const prevDirection = this.plane.position.clone();
			// const startVec = this.plane.position.clone();
			// const targetVec = this.cities[this.target].position.clone().multiplyScalar(this.altitude);
			// const idealAxis = new THREE.Vector3().crossVectors(startVec, targetVec);
			// idealAxis.normalize();
			// const idealQtn = new THREE.Quaternion().setFromAxisAngle(idealAxis, 1);
			// const idealDerection = startVec.clone().applyQuaternion(idealQtn);
			// idealDerection.normalize();
			// const nextDirection = new THREE.Vector3().subVectors(idealDerection, prevDirection);
			// nextDirection.normalize();
			// nextDirection.multiplyScalar(ThreeApp.PLANE_CONFIG.turn);
			// this.planeDirection.add(nextDirection);
			// this.planeDirection.normalize();
			// const axis = new THREE.Vector3().crossVectors(startVec.normalize(), this.planeDirection);
			// axis.normalize();
			// const qtn = new THREE.Quaternion().setFromAxisAngle(axis, this.speed);
			// this.plane.position.applyQuaternion(qtn);
			// console.log(prevDirection, nextDirection);


			


			// const startVec = this.plane.position.clone();
			// const endVec = this.cities[this.target].position.clone().multiplyScalar(this.altitude);
			// startVec.normalize();
			// endVec.normalize();
			// const axis = new THREE.Vector3().crossVectors(startVec, endVec);
			// const cos = startVec.dot(endVec);
			// const radian = Math.acos(cos);
			// const degree = radian * 180 / Math.PI;
			// if( degree > 15 ) {
			// 	this.speed += 0.0002;
			// } else {
			// 	this.speed -= 0.0002;
			// }
			// this.speed = ( this.speed < 0.0002 )? 0.0002 : ( this.speed > ThreeApp.PLANE_CONFIG.maxSpeed )? ThreeApp.PLANE_CONFIG.maxSpeed : this.speed;
			// axis.normalize();
			// const qtn = new THREE.Quaternion().setFromAxisAngle(axis, this.speed);
			// this.plane.position.applyQuaternion(qtn);
			// const directionAxis = new THREE.Vector3().crossVectors(startVec, this.plane.position.position().clone().normalize());
			// const directionCos = 
			// if( degree < 0.1 ) {
			// 	this.isMove = false;
			// 	this.speed = 0;
			// }



			const prevDirection = this.planeDirection.clone();
			const startVec = this.plane.position.clone();
			const endVec = this.cities[this.target].position.clone().multiplyScalar(this.altitude);
			const subVector = new THREE.Vector3().subVectors(endVec, startVec);
			const length = subVector.length();
			if( length < 15 ) {
				this.speed -= 0.01;
			} else {
				this.speed += 0.01;
			}
			if( this.speed > ThreeApp.PLANE_CONFIG.maxSpeed ) {
				this.speed = ThreeApp.PLANE_CONFIG.maxSpeed;
			} else if( this.speed < 0.1 ) {
				this.speed = 0.1;
			}
			console.log(this.speed, length);
			subVector.normalize();
			this.planeDirection.add(subVector.multiplyScalar(ThreeApp.PLANE_CONFIG.turn));
			this.planeDirection.normalize();
			const axis = new THREE.Vector3().crossVectors(prevDirection, this.planeDirection);
			axis.normalize();
			const cos = prevDirection.dot(this.planeDirection);
			const radian = Math.acos(cos);
			const qtn = new THREE.Quaternion().setFromAxisAngle(axis, radian);
			this.plane.quaternion.premultiply(qtn);
			if( length > 0.2 ) {
				const direction = this.planeDirection.clone();
				direction.multiplyScalar(this.speed);
				const nextDirection = startVec.clone().add(direction);
				nextDirection.normalize();
				nextDirection.multiplyScalar(ThreeApp.EARTH_RADIUS * this.altitude);
				this.plane.position.x = nextDirection.x;
				this.plane.position.y = nextDirection.y;
				this.plane.position.z = nextDirection.z;
			} else {
				this.isMove = false;
				this.speed = 0;
				this.plane.position.x = endVec.x;
				this.plane.position.y = endVec.y;
				this.plane.position.z = endVec.z;
			}
		}
		this.renderer.render(this.scene, this.camera);
	}
}

(async ()=>{
	const wrapper = document.querySelector('#webgl');
	const app = new ThreeApp(wrapper);
	await app.load();
	app.init();
	app.render();
})();
