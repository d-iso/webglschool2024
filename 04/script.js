'use strict';

import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

class ThreeApp {
	static CAMERA_PARAM = {
		fovy: 40,
		aspect: window.innerWidth / window.innerHeight,
		near: 0.1,
		far: 200.0,
		position: new THREE.Vector3(0.0, 10.0, 30.0),
		lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
	};

	static RENDERER_PARAM = {
		clearColor: 0x000000,
		width: window.innerWidth,
		height: window.innerHeight,
	};

	static DIRECTIONAL_LIGHT_PARAM = {
		color: 0xffffff,
		intensity: 2,
		position: new THREE.Vector3(1.0, 1.0, 1.0),
	};

	static AMBIENT_LIGHT_PARAM = {
		color: 0xffffff,
		intensity: 0.5,
	};

	static SPHERE_CONFIG = {
		radius: 10,
		splitRow: 48,
		splitCol: 36,
		wave: 8,
	};

	static PLANE_CONFIG = {
		color: {
			h: 180,
			s: 100,
			l: 100,
		},
		move: {
			max: 0.0008,
			scale: 0.00004,
		},
	};

	wrapper;
	renderer;
	scene;
	camera;
	directionalLight;
	ambientLight;
	raycaster;
	wrap;
	planes = [];
	rows = [];
	atn;

	constructor(wrapper){
		this.wrapper = wrapper;

		// bind
		this.render = this.render.bind(this);

		const wave = (center, row, near)=>{
			setTimeout(()=>{
				row[center].userData.addAnimation(near);
			}, 100 * near);
			for( let i=1;i<ThreeApp.SPHERE_CONFIG.wave-near;i++ ) {
				let prev = center - i;
				if( prev < 0 ) {
					prev += ThreeApp.SPHERE_CONFIG.splitCol;
				}
				let next = center + i;
				if( next >= ThreeApp.SPHERE_CONFIG.splitCol ) {
					next -= ThreeApp.SPHERE_CONFIG.splitCol;
				}
				setTimeout(()=>{
					row[prev].userData.addAnimation(i + near);
					row[next].userData.addAnimation(i + near);
				}, 100 * (i + near));
			}
		};

		// raycaster
		this.raycaster = new THREE.Raycaster();
		window.addEventListener('pointermove', (e)=>{
			const x = e.clientX / window.innerWidth * 2 - 1;
			const y = e.clientY / window.innerHeight * 2 - 1;
			const v = new THREE.Vector2(x, -y);
			this.raycaster.setFromCamera(v, this.camera);
			const intersects = this.raycaster.intersectObjects(this.planes);
			if( intersects.length > 0 ) {
				const target = intersects[0].object;
				if( target.userData.mouseon ) return;
				target.userData.mouseon = true;
				const row = target.userData.row;
				const center = target.userData.num;
				const group = target.parent;
				// target.userData.addAnimation(0);
				for( let i=0;i<ThreeApp.SPHERE_CONFIG.wave;i++ ) {
					if( i == 0 ) {
						wave(center, this.rows[row], 0);
					} else {
						if( row - i >= 0 ) {
							wave(center, this.rows[row-i], i);
						}
						if( row + i < ThreeApp.SPHERE_CONFIG.splitRow/2-1 ) {
							wave(center, this.rows[row+i], i);
						}
					}
				}
			}
		}, false);

		// resize
		window.addEventListener('resize', ()=>{
			this.renderer.setSize(window.innerWidth, window.innerHeight);
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
		}, false);
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

		// plane
		this.wrap = new THREE.Group();
		this.scene.add(this.wrap);
		const axis = new THREE.Vector3(0.2, 1, 0);
		axis.normalize();
		this.qtn = new THREE.Quaternion().setFromAxisAngle(axis, 0.001);
		const h = 2 * ThreeApp.SPHERE_CONFIG.radius * Math.sin(Math.PI / ThreeApp.SPHERE_CONFIG.splitRow);
		const rowDegree = 360 / ThreeApp.SPHERE_CONFIG.splitRow;
		const colDegree = 360 / ThreeApp.SPHERE_CONFIG.splitCol;
		const outerRadius = ThreeApp.SPHERE_CONFIG.radius / Math.cos(rowDegree * Math.PI / 180);
		for( let i=1;i<ThreeApp.SPHERE_CONFIG.splitRow/2;i++ ) {
			const row = [];
			const baseDegree = rowDegree * i - 90;
			const underDegree = baseDegree - rowDegree / 2;
			const upperDegree = baseDegree + rowDegree / 2;
			const baseRadius = Math.cos(baseDegree * Math.PI / 180) * ThreeApp.SPHERE_CONFIG.radius;
			const underRadius = outerRadius * Math.cos(underDegree * Math.PI / 180);
			const upperRadius = outerRadius * Math.cos(upperDegree * Math.PI / 180);
			const underLength = 2 * underRadius * Math.sin(Math.PI / ThreeApp.SPHERE_CONFIG.splitCol);
			const upperLength = 2 * upperRadius * Math.sin(Math.PI / ThreeApp.SPHERE_CONFIG.splitCol);
			const y = Math.sin(baseDegree * Math.PI / 180) * ThreeApp.SPHERE_CONFIG.radius;
			const geometory = new THREE.PlaneGeometry(underLength - 0.05, h - 0.03);
			for( let j=0;j< ThreeApp.SPHERE_CONFIG.splitCol;j++) {
				const x = baseRadius * Math.cos(colDegree * j * Math.PI / 180);
				const z = baseRadius * Math.sin(colDegree * j * Math.PI / 180);
				const plane = new THREE.Mesh(geometory);
				this.wrap.add(plane);
				plane.position.set(x, y, z);
				const position = plane.geometry.attributes.position;
				position.setX(0, -1 * (upperLength - 0.05) / 2);
				position.setX(1, (upperLength - 0.05) / 2);
				plane.lookAt(0, 0, 0);
				this.planes.push(plane);
				row.push(plane);
				plane.userData = {
					row: i-1,
					num: j,
					mouseon: false,
					queues: [],
					color: {
						h: ThreeApp.PLANE_CONFIG.color.h,
						s: ThreeApp.PLANE_CONFIG.color.s,
						l: ThreeApp.PLANE_CONFIG.color.l,
					},
					material: ()=>{
						const h = plane.userData.color.h;
						const s = plane.userData.color.s;
						const l = plane.userData.color.l;
						return new THREE.MeshStandardMaterial({
							color: `hsl(${h}, ${s}%, ${l}%)`,
							side: THREE.DoubleSide,
							roughness: 0.5,
						});
					},
					animation: ()=>{
						plane.userData.queues.forEach((queue, i)=>{
							const aftereffect = plane.userData.queues[i].aftereffect;
							let distance = plane.userData.queues[i].distance;
							distance -= 1;
							if( distance < -30 ) {
								plane.userData.queues.splice(i, 1);
								if( !plane.userData.queues.length ) {
									plane.userData.mouseon = false;
									plane.userData.color = {
										h: ThreeApp.PLANE_CONFIG.color.h,
										s: ThreeApp.PLANE_CONFIG.color.s,
										l: ThreeApp.PLANE_CONFIG.color.l,
									};
									plane.material = plane.userData.material();
								}
								return;
							}
							const addVec = plane.position.clone().normalize().multiplyScalar(distance * (ThreeApp.PLANE_CONFIG.move.max - aftereffect * 0.0001));
							plane.position.add(addVec);
							plane.scale.addScalar(ThreeApp.PLANE_CONFIG.move.scale * (distance));
							plane.userData.color.h += distance / 30;
							plane.userData.color.l -= distance / 80;
							if( plane.userData.color.l > 100 ) {
								plane.userData.color.l = 100;
							} else if( plane.userData.color.l < 70 ) {
								plane.userData.color.l = 70;
							}
							plane.material = plane.userData.material();
							plane.userData.queues[i].distance = distance;
						});
					},
					addAnimation: (aftereffect)=>{
						plane.userData.queues.push({distance:31, aftereffect:aftereffect});
					},
				};
				plane.material = plane.userData.material();
			}
			this.rows.push(row);
		}
		this.wrap.rotation.z = -0.2;

		// control
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
	}

	render(){
		requestAnimationFrame(this.render);
		this.controls.update();
		this.wrap.applyQuaternion(this.qtn);
		this.planes.forEach((plane)=>{
			if( !plane.userData.queues.length ) return;
			plane.userData.animation();
		});
		this.renderer.render(this.scene, this.camera);
	}
}

(async ()=>{
	const wrapper = document.querySelector('#webgl');
	const app = new ThreeApp(wrapper);
	app.init();
	app.render();
})();
