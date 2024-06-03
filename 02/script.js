'use strict';

import * as THREE from '../lib/three.module.js';
import { OrbitControls } from '../lib/OrbitControls.js';

class ThreeApp {
	static CAMERA_PARAM = {
		fovy: 60,
		aspect: window.innerWidth / window.innerHeight,
		near: 0.1,
		far: 500.0,
		position: new THREE.Vector3(0, 0, 50),
		lookAt: new THREE.Vector3(0, 0, 0),
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

	static FAN_CONFIG = {
		bladeNum: 4,
		coverWireNum: 25,
		level: 5,
		braldeMaterial: {
			color: 0x00FFFF,
			transparent: true,
			opacity: 0.5,
		},
		bodyMaterial: {
			color: 0xFFFFFF
		}
	};

	static CONTROL = {
		power: document.querySelector('.controls .power'),
		slow: document.querySelector('.controls .slow'),
		fast: document.querySelector('.controls .fast'),
		horizontal: document.querySelector('.controls .horizontal'),
		vertical: document.querySelector('.controls .vertical'),
		level: document.querySelector('.controls .level'),
	};

	renderer;
	scene;
	camera;
	directionalLight;
	ambientLight;
	blades;
	controls;
	axesHelper;
	body;
	power = 0;
	speed = 0;
	move = 0;
	horizontal = 0;
	vertical = 0;
	isON = false;
	isHorizontalSwing = false;
	isVerticalSwing = false;

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
		const bladeMaterial = new THREE.MeshPhongMaterial(ThreeApp.FAN_CONFIG.braldeMaterial);
		const bodyMaterial = new THREE.MeshPhongMaterial(ThreeApp.FAN_CONFIG.bodyMaterial);

		// fan
		const fan = new THREE.Group();
		this.scene.add(fan);

		// body
		this.body = new THREE.Group();
		fan.add(this.body);
		fan.position.y = 6;

		// blade
		const shape = new THREE.Shape();
		shape.moveTo(0, 0);
		shape.lineTo(-5, 7);
		shape.bezierCurveTo(-6, 10, 0, 10, 0, 10);
		shape.bezierCurveTo(0, 10, 6, 10, 5, 7);
		shape.lineTo(5, 7);
		const bladeGeometory = new THREE.ExtrudeGeometry(shape, {
			depth: 0.1,
			bevelEnabled: false
		});
		this.blades = new THREE.Group();
		this.blades.position.z = 9;
		this.body.add(this.blades);
		for( let i=0;i<ThreeApp.FAN_CONFIG.bladeNum;i++ ) {
			const wrap = new THREE.Group();
			this.blades.add(wrap);
			wrap.rotation.z = i * 360 / ThreeApp.FAN_CONFIG.bladeNum * Math.PI / 180;
			const blade = new THREE.Mesh(bladeGeometory, bladeMaterial);
			wrap.add(blade);
			blade.rotation.y = 0.2;

		}

		// cover
		const cover = new THREE.Group();
		this.body.add(cover);
		cover.position.z = 9;
		const wireGeometory = new THREE.TorusGeometry(17, 0.05, 10, 100, Math.PI * 2 / 4);
		const wireOffset = 12;
		for( let i=0;i<ThreeApp.FAN_CONFIG.coverWireNum;i++ ) {
			const wrap = new THREE.Group();
			cover.add(wrap);
			wrap.rotation.z = i * 360 / ThreeApp.FAN_CONFIG.coverWireNum * Math.PI / 180;
			const frontWire = new THREE.Mesh(wireGeometory, bodyMaterial);
			wrap.add(frontWire);
			frontWire.position.z = wireOffset * -1;
			frontWire.rotation.x = 45 * Math.PI / 180;
			frontWire.rotation.y = -90 * Math.PI / 180;
			const backWire = new THREE.Mesh(wireGeometory, bodyMaterial);
			wrap.add(backWire);
			backWire.position.z = wireOffset;
			backWire.rotation.x = -45 * Math.PI / 180;
			backWire.rotation.y = 90 * Math.PI / 180;
		}
		const frameGeometory = new THREE.TorusGeometry(12, 0.2, 10, 100);
		const frame = new THREE.Mesh(frameGeometory, bodyMaterial);
		cover.add(frame);

		// shaft
		const shaftGeometory = new THREE.CylinderGeometry(2, 2, 7, 100);
		const shaft = new THREE.Mesh(shaftGeometory, bodyMaterial);
		shaft.position.z = 6.5;
		shaft.rotation.x = 90 * Math.PI / 180;
		this.body.add(shaft);

		// motor
		const motorGeometory = new THREE.CylinderGeometry(4, 4, 6, 100);
		const motor = new THREE.Mesh(motorGeometory, bodyMaterial);
		motor.rotation.x = 90 * Math.PI / 180;
		this.body.add(motor);

		// stand
		const standGeometory = new THREE.CylinderGeometry(1, 1, 24, 100);
		const stand = new THREE.Mesh(standGeometory, bodyMaterial);
		stand.position.y = -12;
		fan.add(stand);

		// base
		const baseGeometory = new THREE.CylinderGeometry(10, 10, 1, 100);
		const base = new THREE.Mesh(baseGeometory, bodyMaterial);
		base.position.y = -24;
		base.position.z = 4;
		fan.add(base);

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

		// control
		const powerChange = (power)=>{
			if( power ) {
				ThreeApp.CONTROL.power.classList.add('active');
				if( !this.power ) {
					this.power = 1;
				} else {
					this.power += power;
					if( this.power < 1 ) {
						this.power = 1;
					} else if( this.power > ThreeApp.FAN_CONFIG.level ) {
						this.power = ThreeApp.FAN_CONFIG.level;
					}
				}
			} else {
				ThreeApp.CONTROL.power.classList.remove('active');
				this.power = 0;
			}
			ThreeApp.CONTROL.level.querySelectorAll('.dot').forEach((dot, i)=>{
				if( i < this.power ) {
					dot.classList.add('on');
				} else {
					dot.classList.remove('on');
				}
			});
		};
		ThreeApp.CONTROL.power.addEventListener('click', ()=>{
			if( this.isON ) {
				this.isON = false;
				powerChange(0);
			} else {
				this.isON = true;
				powerChange(1);
			}
		}, false);
		ThreeApp.CONTROL.slow.addEventListener('click', ()=>{
			if( !this.isON ) return;
			powerChange(-1);
		}, false);
		ThreeApp.CONTROL.fast.addEventListener('click', ()=>{
			if( !this.isON ) return;
			powerChange(1);
		}, false);
		ThreeApp.CONTROL.horizontal.addEventListener('click', ()=>{
			if( this.isHorizontalSwing ) {
				this.isHorizontalSwing = false;
				ThreeApp.CONTROL.horizontal.classList.remove('active');
			} else {
				this.isHorizontalSwing = true;
				ThreeApp.CONTROL.horizontal.classList.add('active');
			}
		}, false);
		ThreeApp.CONTROL.vertical.addEventListener('click', ()=>{
			if( this.isVerticalSwing ) {
				this.isVerticalSwing = false;
				ThreeApp.CONTROL.vertical.classList.remove('active');
			} else {
				this.isVerticalSwing = true;
				ThreeApp.CONTROL.vertical.classList.add('active');
			}
		}, false);
	}

	render(){
		requestAnimationFrame(this.render);
		this.controls.update();
		// move
		if( this.power != this.speed ) {
			this.speed += ( this.power < this.speed )? -0.01 : 0.01;
			this.speed = Math.round(this.speed * 100) / 100;
		}
		this.move -= Math.round(this.speed * 0.1 * 100) / 100;
		this.blades.rotation.z = this.move;
		// horizontal
		if( this.isON && this.isHorizontalSwing ) {
			this.horizontal += 0.4;
			this.body.rotation.y = Math.sin(this.horizontal * Math.PI / 180) * 0.3;
		}
		// vertical
		if( this.isON && this.isVerticalSwing ) {
			this.vertical += 0.4;
			this.body.rotation.x = Math.sin(this.vertical * Math.PI / 180) * 0.3;
		}
		this.renderer.render(this.scene, this.camera);
	}
}

(()=>{
	const wrapper = document.querySelector('#webgl');
	const app = new ThreeApp(wrapper);
	app.render();
})();
