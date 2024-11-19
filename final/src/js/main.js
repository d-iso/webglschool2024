'use strict';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';
import normalizeWheel from 'normalize-wheel';
import Stats from 'stats.js';

import vertexShader from './shader.vert';
import fragmentShader from './shader.frag';

class App {
	DEV = false; // 開発用
	isSTATS = false; // stats
	ENABLE_CONTROL = false; // control
	CAMERA_PARAM = {
		fovy: this.size().camera.fovy,
		aspect: this.size().ww / this.size().wh,
		near: 0.1,
		far: 10000.0,
		lookAt: new THREE.Vector3(0.0, 0.0, 0.0),
	};
	MATERIAL_CONFIG = {
		color: 0xFFFFFF,
		side: THREE.DoubleSide,
		transparent: true,
		// wireframe: this.DEV,
	};

	// plane
	PLANE_CONFIG = {
		width: 10,
		height: 10 * 1080 / 1920,
	};
	easing = 'power2.out';
	duration = 0.3;
	delay = 0.05;

	// debug用
	axesHelper;
	controls;
	viewportMesh;
	stats;

	// three
	renderer;
	camera;
	scene;
	progressbar;

	// light
	DIRECTIONAL_LIGHT_PARAM = {
		color: 0xffffff,
		intensity: 2,
		position: new THREE.Vector3(0.0, 0.0, 10.0),
	};
	SPOT_LIGHT_PARAM = {
		color: 0xffffff,
		intensity: 100,
		distance: 0,
		angle: Math.PI / 10,
		penumbra: 1,
		decay: 1,
		position: new THREE.Vector3(0.0, 0.0, 50.0),
	};
	AMBIENT_LIGHT_PARAM = {
		color: 0xffffff,
		intensity: 0.05,
	};
	spotLight;
	directionalLight;
	ambientLight;

	// fog
	FOG_PARAM = {
		color: 0x000000,
		near: 150,
		far: 200,
	};

	// data
	limit = 120;
	// limit = 240;
	items = [];
	planes = [];
	mode = 'spiral';
	dissolveMap;
	isChanging = true;

	// wheel
	isWheel = false;
	velocity = 0;
	wheelDirection = 1;
	prevVelocity = 0;
	speed = 1;

	// spiral
	SPIRAL_CONFIG = {
		distance: 15,
		stepRad: 45,
		inclination: -8,
		stepY: 1.6,
		startNum: null,
		endNum: null,
	};
	spiralGroup;
	isSpiralStart = false;
	isSpiralEnd = false;

	// horizon
	HORIZON_CONFIG = {
		line: 4,
		gap: 0.5,
		inclination: -5,
		startNum: null,
		endNum: null,
	};
	horizonGroups = [];
	isHorizonStart = false;
	isHorizonEnd = false;
	
	// hover
	prevHoverTarget = null;;

	constructor(wrapper){
		// renderer
		const color = new THREE.Color(0x000000);
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setClearColor(color);
		// this.renderer.outputEncoding = THREE.sRGBEncoding;
		wrapper.appendChild(this.renderer.domElement);

		this.progressbar = document.querySelector('.progress');

		// scene
		this.scene = new THREE.Scene();

		// camera
		this.camera = new THREE.PerspectiveCamera(
			this.CAMERA_PARAM.fovy,
			this.CAMERA_PARAM.aspect,
			this.CAMERA_PARAM.near,
			this.CAMERA_PARAM.far,
		);
		this.camera.position.x = 0.0;
		this.camera.position.y = 0.0;
		this.camera.position.z = 150.0;
		this.camera.lookAt(this.CAMERA_PARAM.lookAt);

		// fog
		this.scene.fog = new THREE.Fog(
			this.FOG_PARAM.color,
			this.FOG_PARAM.near,
			this.FOG_PARAM.far
		);

		// light
		this.directionalLight = new THREE.DirectionalLight(
			this.DIRECTIONAL_LIGHT_PARAM.color,
			this.DIRECTIONAL_LIGHT_PARAM.intensity,
		);
		this.directionalLight.position.copy(this.DIRECTIONAL_LIGHT_PARAM.position);
		this.directionalLight.visible = false;
		this.scene.add(this.directionalLight);
		this.spotLight = new THREE.SpotLight(
			this.SPOT_LIGHT_PARAM.color,
			this.SPOT_LIGHT_PARAM.intensity,
			this.SPOT_LIGHT_PARAM.distance,
			this.SPOT_LIGHT_PARAM.angle,
			this.SPOT_LIGHT_PARAM.penumbra,
			this.SPOT_LIGHT_PARAM.decay,
		);
		this.spotLight.position.copy(this.SPOT_LIGHT_PARAM.position);
		this.spotLight.visible = false;
		this.scene.add(this.spotLight);
		// this.lightHelper = new THREE.SpotLightHelper(this.spotLight);
		// this.scene.add(this.lightHelper);
		this.ambientLight = new THREE.AmbientLight(
			this.AMBIENT_LIGHT_PARAM.color,
			this.AMBIENT_LIGHT_PARAM.intensity,
		);
		this.scene.add(this.ambientLight);

		/* debug */
		if( this.DEV ) {
			// axes
			this.axesHelper = new THREE.AxesHelper(10.0);
			this.scene.add(this.axesHelper);
			// control
			if( this.ENABLE_CONTROL ) {
				this.controls = new OrbitControls(this.camera, this.renderer.domElement);
			}
		}
		if( this.isSTATS ) {
			// stats
			this.stats = new Stats();
			this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
			document.body.appendChild(this.stats.dom)
			this.stats.domElement.style.position = 'fixed';
			this.stats.domElement.style.top = 0;
			this.stats.domElement.style.left = 0;
			this.stats.domElement.style.zIndex = 5;
		}

		// bind
		this.render = this.render.bind(this);

		// resize
		this.setSize();
		window.addEventListener('resize', ()=>{
			this.setSize();
		});

		// wheel
		let wheelTimerID;
		window.addEventListener('wheel', (e)=>{
			const normalized = normalizeWheel(e);
			clearTimeout(wheelTimerID);
			if( this.isChanging ) {
				clearTimeout(wheelTimerID);
				this.isWheel = false;
				return;
			}
			this.isWheel = true;
			this.velocity = Math.abs(normalized.pixelY);
			this.wheelDirection = ( normalized.pixelY < 0 )? -1 : 1;
			wheelTimerID = setTimeout(()=>{
				this.isWheel = false;
			}, 50);
		});
		window.addEventListener('keydown', (e)=>{
			const code = e.code;
			if( code == 'ArrowDown' || code == 'ArrowUp' ) {
				if( this.isChanging ) {
					this.isWheel = false;
					return;
				}
				this.isWheel = true;
				this.velocity = 50;
				this.wheelDirection = ( code == 'ArrowUp' )? -1 : 1;
			}
		});
		window.addEventListener('keyup', (e)=>{
			const code = e.code;
			this.velocity = 0;
			if( code == 'ArrowDown' || code == 'ArrowUp' ) {
				this.isWheel = false;
			}
		});

		// raycaster
		this.raycaster = new THREE.Raycaster();
		window.addEventListener('pointermove', (e)=>{
			const x = e.clientX / window.innerWidth * 2 - 1;
			const y = e.clientY / window.innerHeight * 2 - 1;
			const v = new THREE.Vector2(x, -y);
			this.spotLight.position.x = x * this.size().cv.right;
			this.spotLight.position.y = y * this.size().cv.bottom;
			this.raycaster.setFromCamera(v, this.camera);
			const intersects = this.raycaster.intersectObjects(this.planes);
			if( intersects.length > 0 ) {
				const target = intersects[0].object;
				gsap.to(target.material.userData.uniforms.hover, {
					value: 1.0,
					duration: 0.5,
				});
				if( this.prevHoverTarget && this.prevHoverTarget != target ) {
					gsap.to(this.prevHoverTarget.material.userData.uniforms.hover, {
						value: 0.0,
						duration: 0.5,
					});
				}
				this.prevHoverTarget = target;
			} else {
				if( this.prevHoverTarget ) {
					gsap.to(this.prevHoverTarget.material.userData.uniforms.hover, {
						value: 0.0,
						duration: 0.5,
					});
				}
				this.prevHoverTarget = null;
			}
		});
	}

	size(){
		const ww = window.innerWidth;
		const wh = window.innerHeight;
		const cameraZ = ( this.mode == 'spiral' )? 15.0 * 2 * 1920 / ww :  13.0 * 1.5 * 1080 / wh;
		const cameraFovy = 60;
		const cvh = cameraZ * Math.tan(cameraFovy / 2 * Math.PI / 180) * 2;
		const cvw = ww / wh * cvh;
		return {
			ww: ww,
			wh: wh,
			camera: {
				fovy: cameraFovy,
				z: cameraZ,
			},
			cv: {
				width: cvw,
				height: cvh,
				top: cvh / 2,
				right: cvw / 2,
				bottom: -1 * cvh / 2,
				left: -1 * cvw / 2,
			},
		};
	}

	setSize(){
		/* debug */
		if( this.DEV ) {
			if( this.viewportMesh ) {
				this.viewportMesh.scale.x = this.size().cv.width - 0.1;
				this.viewportMesh.scale.y = this.size().cv.height - 0.1;
			}
		}

		const w = this.size().ww;
		const h = this.size().wh;
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(w, h);
		this.camera.aspect = w / h;
		this.camera.position.z = this.size().camera.z;
		this.camera.updateProjectionMatrix();
		this.scene.fog.near = this.size().camera.z;
		this.scene.fog.far = this.size().camera.z + this.SPIRAL_CONFIG.distance + 3;
	}

	async load(){
		const loader = new THREE.TextureLoader();
		let loaded = 0;
		const promises = [];
		const res = await fetch('./works.json');
		const json = await res.json();
		this.dissolveMap = await loader.loadAsync('./imgs/noise.jpg');
		const textureLoad = (path, index)=>{
			return new Promise((resolve)=>{
				loader.load(path, (texture)=>{
					this.items[index].mesh.material.map = texture;
					texture.dispose();
					loaded++;
					this.progressbar.style.scale = `${Math.round(loaded / length)} 1`;
					resolve();
				});
			});
		};
		const length = ( this.limit && json.length > this.limit )? this.limit : json.length;
		const geometry = new THREE.PlaneGeometry(this.PLANE_CONFIG.width, this.PLANE_CONFIG.height, 16, 16);
		const defaultPosition = [];
		const curvePosition = [];
		for( let i=0;i<geometry.attributes.position.count;i++ ) {
			const x = geometry.attributes.position.getX(i);
			const y = geometry.attributes.position.getY(i);
			const z = geometry.attributes.position.getZ(i);
			defaultPosition.push({
				x: x,
				y: y,
				z: z,
			});
			curvePosition.push({
				x: x,
				y: y,
				z: -1 * this.SPIRAL_CONFIG.distance * ( 1 - Math.cos(Math.abs(x) * 2 / this.SPIRAL_CONFIG.distance / 2)),
			});
		}
		json.forEach((item, i)=>{
			if( this.limit && i >= this.limit ) return;
			const material = new THREE.MeshLambertMaterial(this.MATERIAL_CONFIG);
			Object.assign(material.userData, {
				uniforms: {
					hover: {
						value: 0.0,
					},
					dissolveMap: {
						value: this.dissolveMap,
					},
					uThreshold: {
						value: 0.0,
					},
					uEdgeWidth: {
						value: 0.01,
					},
					uEdgeColor: {
						value: [0, 0.89, 1.0],
					},
				}
			});
			material.onBeforeCompile = (shader)=>{
				Object.assign(shader.uniforms, material.userData.uniforms);
				shader.vertexShader = vertexShader;
				shader.fragmentShader = fragmentShader;
			};
			const mesh = new THREE.Mesh(geometry.clone(), material);
			// spiral
			if( i == 0 ) {
				this.SPIRAL_CONFIG.startNum = i;
			} else if( i == length - 1 ) {
				this.SPIRAL_CONFIG.endNum = i;
			}
			// horizon
			const col = i % Math.floor(length / this.HORIZON_CONFIG.line);
			const row = Math.floor(i / (length / this.HORIZON_CONFIG.line));
			const dir = ( row % 2 == 0 )? 1 : -1;
			const offset = (length / this.HORIZON_CONFIG.line * (this.PLANE_CONFIG.width + this.HORIZON_CONFIG.gap) - this.HORIZON_CONFIG.gap) / 2;
			if( col == 0 && row == 0 ) {
				this.HORIZON_CONFIG.startNum = i;
			} else if( col == Math.floor(length / this.HORIZON_CONFIG.line) - 1 && row == 0 ) {
				this.HORIZON_CONFIG.endNum = i;
			}
			// push
			this.items[i] = {
				id: item.id,
				title: item.title,
				inview: false,
				mesh: mesh,
				mode: null,
				spiral: {
					position: {
						x: Math.sin(i * this.SPIRAL_CONFIG.stepRad * Math.PI / 180) * this.SPIRAL_CONFIG.distance,
						y: (i - length / 2) * -1 * this.SPIRAL_CONFIG.stepY,
						z: Math.cos(i * this.SPIRAL_CONFIG.stepRad * Math.PI / 180) * this.SPIRAL_CONFIG.distance,
					},
					rotation: {
						x: 0,
						y: i * this.SPIRAL_CONFIG.stepRad * Math.PI / 180,
						z: this.SPIRAL_CONFIG.inclination * Math.PI / 180,
					},
					attributePosition: curvePosition,
				},
				horizon: {
					col: col,
					row: row,
					position: {
						x: (this.PLANE_CONFIG.width + this.HORIZON_CONFIG.gap) * col * dir - offset * dir,
						y: 0,
						z: 0,
					},
					rotation: {
						x: 0,
						y: 0,
						z: 0,
					},
					attributePosition: defaultPosition,
				},
				hidden: (duration=0, delay=0, onComplete)=>{
					return new Promise((resolve)=>{
						gsap.to(mesh.material.userData.uniforms.uThreshold, {
							value: 0.0,
							ease: this.easing,
							duration: duration,
							delay: delay,
							onComplete: ()=>{
								mesh.material.opacity = 0;
								if( onComplete ) {
									onComplete();
								}
								resolve();
							},
						});
					});
				},
				visible: (duration=0, delay=0, onComplete)=>{
					return new Promise((resolve)=>{
						gsap.to(mesh.material.userData.uniforms.uThreshold, {
							value: 1.0,
							ease: this.easing,
							duration: duration,
							delay: delay,
							onStart: ()=>{
								mesh.material.opacity = 1;
							},
							onComplete: ()=>{
								if( onComplete ) {
									onComplete();
								}
								resolve();
							},
						});
					});
				},
			};
			this.planes.push(mesh);
			if( this.DEV ) {
				const num = i % 2 + 1;
				promises.push(textureLoad(`/imgs/sample${num}.jpg`, i));
			} else {
				// promises.push(textureLoad(`https://www.re-d.jp${item.bg}`, i));
				promises.push(textureLoad(`https://www.re-d.jp${item.bg}`, i));
			}
		});
		if( promises.length ) {
			await Promise.all(promises);
		}
	}

	init(){
		/* debug */
		if( this.DEV ) {
			this.viewportMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({wireframe:true}));
			this.scene.add(this.viewportMesh);
			this.viewportMesh.scale.x = this.size().cv.width - 0.1;
			this.viewportMesh.scale.y = this.size().cv.height - 0.1;
		}

		// scene add
		this.spiralGroup = new THREE.Group();
		this.scene.add(this.spiralGroup);
		for( let i=0;i<this.HORIZON_CONFIG.line;i++ ) {
			const groupWrap = new THREE.Group();
			const group = new THREE.Group();
			this.horizonGroups.push(group);
			groupWrap.add(group);
			this.scene.add(groupWrap);
			groupWrap.position.y = (this.PLANE_CONFIG.height * this.HORIZON_CONFIG.line + this.HORIZON_CONFIG.gap * (this.HORIZON_CONFIG.line - 1)) / 2 - i * ( this.PLANE_CONFIG.height +  this.HORIZON_CONFIG.gap) - this.PLANE_CONFIG.height / 2;
			groupWrap.rotation.z = this.HORIZON_CONFIG.inclination * Math.PI / 180;
		}
		this.items.forEach((item, i)=>{
			this.scene.add(item.mesh);
		});

		// setup
		if( this.mode == 'spiral' ) {
			this.spiralSetup(true);
		} else {
			this.horizonSetup(true);
		}
	}

	async spiralSetup(init=false){
		this.spiralGroup.position.y = 0;
		this.isSpiralStart = false;
		this.isSpiralEnd = false;
		const hiddenPromises = [];
		const visiblePromises = [];
		let inviewCount = 0;
		let hiddenStep = 0;
		let visibleStep = 0;
		inviewCount = this.items.filter(item => item.inview).length;
		this.items.forEach((item, i)=>{
			const duration = ( item.inview && !init )? this.duration * 3 : 0;
			hiddenStep += ( item.inview && !init )? 1 : 0;
			const delay = ( this.isHorizonEnd? inviewCount - hiddenStep : hiddenStep ) * this.delay;
			hiddenPromises.push(item.hidden(duration, delay, ()=>{
				this.spiralGroup.add(item.mesh);
				item.mode = 'spiral';
				// attribute position
				const position = item.mesh.geometry.attributes.position;
				for( let i=0;i<position.count;i++ ) {
					position.setX(i, item.spiral.attributePosition[i].x);
					position.setY(i, item.spiral.attributePosition[i].y);
					position.setZ(i, item.spiral.attributePosition[i].z);
					position.needsUpdate = true;
				}
				item.mesh.position.x = item.spiral.position.x;
				item.mesh.position.y = item.spiral.position.y;
				item.mesh.position.z = item.spiral.position.z;
				item.mesh.rotation.z = item.spiral.rotation.x;
				item.mesh.rotation.y = item.spiral.rotation.y;
				item.mesh.rotation.z = item.spiral.rotation.z;
			}));
		});
		await Promise.all(hiddenPromises);
		this.mode = 'spiral';
		this.directionalLight.visible = false;
		this.spotLight.visible = true;
		this.setSize();
		inviewCount = this.items.filter(item => item.inview).length;
		this.items.forEach((item, i)=>{
			const duration = this.duration * 3;
			visibleStep += ( item.inview )? 1 : 0;
			const delay = ( !this.isHorizonEnd? inviewCount - visibleStep : visibleStep ) * this.delay;
			visiblePromises.push(item.visible(duration, delay));
		});
		await Promise.all(visiblePromises);
		this.isChanging = false;
	}


	async horizonSetup(init=false){
		this.horizonGroups.forEach((group, i)=>{
			group.position.x = 0;
		});
		this.isHorizonStart = false;
		this.isHorizonEnd = false;
		const hiddenPromises = [];
		const visiblePromises = [];
		let inviewCount = 0;
		let hiddenStep = 0;
		let visibleStep = 0;
		inviewCount = this.items.filter(item => item.inview).length;
		this.items.forEach((item, i)=>{
			const duration = ( item.inview && !init )? this.duration * 3 : 0;
			hiddenStep += ( item.inview && !init )? 1 : 0;
			const delay = ( this.isSpiralEnd? inviewCount - hiddenStep : hiddenStep ) * this.delay;
			hiddenPromises.push(item.hidden(duration, delay, ()=>{
				this.horizonGroups[item.horizon.row].add(item.mesh);
				item.mode = 'horizon';
				// attribute position
				const position = item.mesh.geometry.attributes.position;
				for( let i=0;i<position.count;i++ ) {
					position.setX(i, item.horizon.attributePosition[i].x);
					position.setY(i, item.horizon.attributePosition[i].y);
					position.setZ(i, item.horizon.attributePosition[i].z);
					position.needsUpdate = true;
				}
				item.mesh.position.x = item.horizon.position.x;
				item.mesh.position.y = item.horizon.position.y;
				item.mesh.position.z = item.horizon.position.z;
				item.mesh.rotation.z = item.horizon.rotation.x;
				item.mesh.rotation.y = item.horizon.rotation.y;
				item.mesh.rotation.z = item.horizon.rotation.z;
			}));
		});
		await Promise.all(hiddenPromises);
		this.mode = 'horizon';
		this.directionalLight.visible = true;
		this.spotLight.visible = false;
		this.setSize();
		inviewCount = this.items.filter(item => item.inview).length;
		this.items.forEach((item, i)=>{
			const duration = this.duration * 3;
			visibleStep += ( item.inview )? 1 : 0;
			const delay = ( !this.isSpiralEnd? inviewCount - visibleStep : visibleStep ) * this.delay;
			visiblePromises.push(item.visible(duration, delay));
		});
		await Promise.all(visiblePromises);
		this.isChanging = false;
	}

	render(){
		requestAnimationFrame(this.render);
		// this.lightHelper.update();
		/* debug */
		if( this.DEV ) {
			if( this.ENABLE_CONTROL ) {
				this.controls.update();
			}
		}
		if( this.isSTATS ) {
			this.stats.begin();
			this.stats.end();
		}

		// wheel
		if( this.isWheel && this.prevVelocity < this.velocity && !this.isChanging ) {
			this.speed = Math.min(this.speed + this.velocity * 0.2, 50);
			this.prevVelocity = this.velocity;
		} else {
			this.speed = Math.max(this.speed - this.speed * 0.1, 1);
			this.prevVelocity = 0;
		}

		this.spiralGroup.rotation.y += this.speed * -0.001 * this.wheelDirection;
		this.spiralGroup.position.y += this.speed * 0.015 * this.wheelDirection;
		this.horizonGroups.forEach((group, i)=>{
			const dir = ( i % 2 == 0 )? -1 : 1;
			group.position.x += this.speed * 0.015 * this.wheelDirection * dir;
		});

		this.items.forEach((item, i)=>{
			const wp = item.mesh.getWorldPosition(new THREE.Vector3());
			if(
				wp.x > this.size().cv.left - 10
				&& wp.x < this.size().cv.right + 10
				&& wp.y > this.size().cv.bottom - 5
				&& wp.y < this.size().cv.top + 5
			) {
				item.inview = true;
				if( item.mode == 'horizon' ) {
					for( let j=0;j<item.mesh.geometry.attributes.position.count;j++ ) {
						item.mesh.geometry.attributes.position.setZ(j, this.wheelDirection * (this.speed - 1) * Math.cos((wp.x + item.horizon.attributePosition[j].x) / this.PLANE_CONFIG.width * 2) * 0.05 + item.horizon.attributePosition[j].z);
						item.mesh.geometry.attributes.position.needsUpdate = true;
					}
				}
			} else {
				item.inview = false;
			}
		});

		if( !this.isChanging ) {
			if( this.mode == 'spiral' ) {
				const isSpiralStart = this.items[this.SPIRAL_CONFIG.startNum].inview;
				const isSpiralEnd = this.items[this.SPIRAL_CONFIG.endNum].inview;
				if( this.isSpiralStart != isSpiralStart ) {
					this.isSpiralStart = isSpiralStart;
					if( this.DEV ) {
						console.log('spiral start', this.isSpiralStart);
					}
				}
				if( this.isSpiralEnd != isSpiralEnd ) {
					this.isSpiralEnd = isSpiralEnd;
					if( this.DEV ) {
						console.log('spiral end', this.isSpiralEnd);
					}
				}
			} else {
				const isHorizonStart = this.items[this.HORIZON_CONFIG.startNum].inview;
				const isHorizonEnd = this.items[this.HORIZON_CONFIG.endNum].inview;
				if( this.isHorizonStart != isHorizonStart ) {
					this.isHorizonStart = isHorizonStart;
					if( this.DEV ) {
						console.log('horizon start', this.isHorizonStart);
					}
				}
				if( this.isHorizonEnd != isHorizonEnd ) {
					this.isHorizonEnd = isHorizonEnd;
					if( this.DEV ) {
						console.log('horizon end', this.isHorizonEnd);
					}
				}
			}
			if( this.mode == 'spiral' && ( this.isSpiralStart || this.isSpiralEnd ) ) {
				this.isChanging = true;
				this.horizonSetup();
			}
			if( this.mode == 'horizon' && ( this.isHorizonStart || this.isHorizonEnd ) ) {
				this.isChanging = true;
				this.spiralSetup();
			}
		}

		// render
		this.renderer.render(this.scene, this.camera);
	}
}


(async ()=>{
	const app = new App(document.querySelector('#app'));
	await app.load();
	app.progressbar.style.transformOrigin = 'right center';
	app.progressbar.style.scale = '0 1';
	app.progressbar.addEventListener('transitionend', ()=>{
		document.body.removeChild(app.progressbar);
		app.init();
		app.render();
	}, {once:true});
})();
