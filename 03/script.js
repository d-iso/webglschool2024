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
		turn: 0.1,
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
		// const earthMaterial = new THREE.MeshPhongMaterial({
		// 	color: 0x00FFFF,
		// 	transparent: true,
		// 	opacity: 0.5,
		// });
		const earthMaterial = new THREE.MeshPhongMaterial({
			color: 0xffffff,
		});
		earthMaterial.map = this.earthTexture;
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
		this.plane.position.set(0, ThreeApp.EARTH_RADIUS + 1, 0);
		const dfDirection = this.plane.position.clone().normalize();
		this.planeDirection = this.cities['tokyo'].position.clone().normalize();
		const axis = new THREE.Vector3().crossVectors(dfDirection, this.planeDirection);
		axis.normalize();
		const cos = dfDirection.dot(this.planeDirection);
		const radian = Math.acos(cos);
		const qtn = new THREE.Quaternion().setFromAxisAngle(axis, radian);
		console.log(cos);
		this.plane.position.applyQuaternion(qtn);
		this.plane.quaternion.premultiply(qtn);

		// axes
		// const axesBarLength = 100.0;
		// this.axesHelper = new THREE.AxesHelper(axesBarLength);
		// this.scene.add(this.axesHelper);

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
			if( length > 0.2 ) {
				subVector.normalize();
				this.planeDirection.add(subVector.multiplyScalar(ThreeApp.PLANE_CONFIG.turn));
				this.planeDirection.normalize();
				const direction = this.planeDirection.clone();
				const nextVec = startVec.clone().add(direction.multiplyScalar(this.speed));
				nextVec.normalize();
				nextVec.multiplyScalar(ThreeApp.EARTH_RADIUS * this.altitude);
				this.plane.position.x = nextVec.x;
				this.plane.position.y = nextVec.y;
				this.plane.position.z = nextVec.z;
				const axis = new THREE.Vector3().crossVectors(prevDirection, this.planeDirection);
				axis.normalize();
				const cos = prevDirection.dot(this.planeDirection);
				const radian = Math.acos(cos);
				const qtn = new THREE.Quaternion().setFromAxisAngle(axis, radian);
				this.plane.quaternion.premultiply(qtn);
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
