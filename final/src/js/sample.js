/**
 * /////////////////// FIX //////////////////////
 * mouse event - after leaving the page and come back, group rotates quiest fast. adjust mouse position.
 * store uniques id for each row in userdata of this.plane
*/

import * as THREE from './lib/three.module.js';
import { WebGLUtility } from './lib/webgl.js';
import { EffectComposer } from './lib/EffectComposer.js'
import { RenderPass } from './lib/RenderPass.js'
import { ShaderPass } from './lib/ShaderPass.js'
import GUI from './lib/lil-gui.min.js';
import loadImages from './Image.js';

document.addEventListener('DOMContentLoaded', () => {
    loadImages().then(textures => {
        const wrapper = document.getElementById('webgl');
        const app = new App(wrapper, textures);

        app.init();
    }).catch(error => {
        console.error(error);
    });
})


class App {
    static PI = 3.141592653589793;

    /**
     * window size
     */
    static SIZE = {
        width: window.innerWidth,
        height: window.innerHeight
    }


    /**
     * Mouse
     */
    static MOUSE = {
        x: 0,
        y: 0
    }


    /**
     * Render
     */
    static RENDERER_PARAM = {
        clearColor: "#212121",
    };


    /**
     * Camera
     */
    static CAMERA_PARAM = {
        fov: 75,
        aspect: App.SIZE.width / App.SIZE.height,
        near: 0.01,
        far: 1000,
        position: new THREE.Vector3(0, 0, 8),
        lookAt: new THREE.Vector3(0, 0, 0)
    }


    /**
     * Cylinder
     */
    static Cylinder_PARAM = {
        radiusTop: 5,
        radiusBottom: 5,
        height: 20,
        radialSegments: 25,
        heightSegments: 20,
    }


    /**
     * shader src
     */
    static MATERIAL_PARAM = {
        shaderSourcePath: {
            vertexShader: './shaders/index.vert',
            fragmentShader: './shaders/index.frag',
            noise: './shaders/noise.vert',
        }
    }

    shaderSource = {
        vertexShader: null, // 頂点シェーダ
        fragmentShader: null, // フラグメントシェーダ
        noise: null
    };


    /**
     * Plane 5
     */
    static PLANE_PARAM = {
        rows: 8,
        columns: 8,
        planeWidth: 2.4,
        planeHeight: 1.4,
        rowSpacing: 20,
    }


    /**
     * Plane rotation
     */
    static PLANE_ROTATION = {
        evenRowSpeed: 0.05,
        oddRowSpeed: 0.02
    };


    /**
     * ホイール操作のための変数
     */
    static WHEEL_PARAM = {
        targetY: 0,
        smoothness: 0.1,
        rotationSmoothness: 0.06,
        autoRotationSpeed: 0.08, // 自動回転の速度
    }


    /**
     * スクロール制限のための変数
    */
    static SCROLL_RANGE = {
        cylinderTopY: this.Cylinder_PARAM.height / 2,
        cylinderBottomY: -this.Cylinder_PARAM.height / 2,
        viewportTopY: this.CAMERA_PARAM.position.z + 5,
        viewportBottomY: -(this.CAMERA_PARAM.position.z + 5),
    }


    /**
     * Lerp
     */
    static LERP = {
        transitionFactor: 0,
        transitionSpeed: 0.03, // 遷移の速度（値が大きいほど速く遷移）
    }


    /**
     * Mouse
     */
    static MOUSE_ROTAT_PARAM = {
        mouseRotationSpeed: 0.5, // マウス回転の速度係数
        mouseYRotationSpeed: 0.1, // Y軸回転の速度係数
        MAX_X_ROTATION: Math.PI / 314 // 1度, X軸の回転の最大角度を定義（ラジアン）
    }


    // vertex shader
    static PLANE_CURVE_PARAM = {
        curveMax: 0.0,
        curveMin: 0.5,
    }


    wrapper
    textures
    camera
    scene
    renderer
    geometry
    material
    cylinder
    group
    clock

    // raycaster
    raycaster
    pointer
    hoveredPlane

    // image plane
    planeGeometry
    planeMaterial
    plane

    // Wheel event
    isWheel
    wheelTimeout
    newTargetY

    // Mouse event
    mouseSpeed = App.LERP.transitionSpeed
    isMouseMove
    mouseMoveTimeout

    // effect composer
    composer
    renderPass
    glitchPass

    // Helper
    axesHelper

    // plane info from json file
    planeData


    /**
     * constructor
     */
    constructor(wrapper, textures) {
        this.wrapper = wrapper
        this.textures = textures
        this.isWheel = false
        this.isMouseMove = false
        this.time = 0

        this.group = new THREE.Group()
        this.clock = new THREE.Clock()

        this.raycaster = new THREE.Raycaster()
        this.pointer = new THREE.Vector2(0, 0)
        this.hoveredPlane = null

        this.touchStartY = 0;
        this.lastTouchY = 0;
        this.isTouching = false;
        this.isMobile = this.detectMobile();
        this.adjustForMobile();

        // クリックイベントリスナーを追加
        if (this.isMobile) {
            this.wrapper.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
            this.wrapper.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        } else {
            this.wrapper.addEventListener('click', this.onClickEvent.bind(this));
        }

        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal()
        });

        // Get modal elements
        this.infoPanel = document.getElementById('infoPanel');
        this.textureImage = document.getElementById('textureImage');
        this.titleElement = document.getElementById('title');
        this.descriptionElement = document.getElementById('description');


        // Bind this
        this.render = this.render.bind(this)
        this.wheelEvent = this.wheelEvent.bind(this)
        this.resize = this.resize.bind(this)
        this.mouseMoveEvent = this.mouseMoveEvent.bind(this)


        // Add event listener
        window.addEventListener("mousemove", this.mouseMoveEvent, false)
        window.addEventListener("resize", this.debouncedResize.bind(this), false)

        if (this.isMobile) {
            this.wrapper.addEventListener('touchstart', this.touchStartEvent.bind(this), { passive: false });
            this.wrapper.addEventListener('touchmove', this.touchMoveEvent.bind(this), { passive: false });
            this.wrapper.addEventListener('touchend', this.touchEndEvent.bind(this), { passive: false });
        } else {
            window.addEventListener("wheel", this.wheelEvent.bind(this), { passive: true });
        }
    }


    /**
     * init
     */
    init() {
        this.load().then(() => {
            this.setup()
            this.createCylinder()
            this.resize()
            this.composerPass()
            // this.addGUI()
            this.renderStart()

            // クラスのコンストラクタや初期化メソッドでJSONファイルのフェッチを行う
            fetch('/modal.json')
                .then(response => response.json())
                .then(data => {
                    // 取得したJSONデータをメモリに保存
                    this.planeData = data.planes;
                })
                .catch(error => {
                    console.error('Error fetching JSON data:', error);
                });
        })
    }


    /**
     * Setup for scene, camera, renderer, mesh, resize
     */
    setup() {
        // Scene
        this.scene = new THREE.Scene()

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            App.CAMERA_PARAM.fov,
            App.CAMERA_PARAM.aspect,
            App.CAMERA_PARAM.near,
            App.CAMERA_PARAM.far
        );
        this.camera.position.copy(App.CAMERA_PARAM.position);
        this.camera.lookAt(App.CAMERA_PARAM.lookAt);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: false
        });
        this.renderer.setClearColor(App.RENDERER_PARAM.clearColor);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.setSize(App.SIZE.width, App.SIZE.height);
        this.wrapper.appendChild(this.renderer.domElement);

        // Helper
        const axesBarLength = 10.0;
        this.axesHelper = new THREE.AxesHelper(axesBarLength);
        // this.scene.add(this.axesHelper);
    }


    /**
     * リソースの読み込み
     * @returns {Promise<unknown>}
     */
    async load() {
        try {
            this.shaderSource.vertexShader = await WebGLUtility.loadFile(App.MATERIAL_PARAM.shaderSourcePath.vertexShader)
            this.shaderSource.fragmentShader = await WebGLUtility.loadFile(App.MATERIAL_PARAM.shaderSourcePath.fragmentShader)
            this.shaderSource.noise = await WebGLUtility.loadFile(App.MATERIAL_PARAM.shaderSourcePath.noise)
        } catch (error) {
            console.error('Error loading shader files:', error);
            throw error;
        }
    }


    /**
    * Effect composer
    */
    composerPass() {
        // Load noise glsl
        const noise = this.shaderSource.noise

        // 1. Pass renderer to compoer
        this.composer = new EffectComposer(this.renderer)

        // 2. Setup for render pass to composer
        this.renderPass = new RenderPass(this.scene, this.camera)
        this.composer.addPass(this.renderPass)

        // 3. Custom shader pass
        this.rgbShiftEffect = {
            uniforms: {
                tDiffuse: { value: null },
                time: { value: null },
                amount: { value: 0.009 },
                angle: { value: 0.0 }
            },

            vertexShader: `
            varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,

            fragmentShader: `
            uniform sampler2D tDiffuse;
            varying vec2 vUv;
            uniform float time;
            uniform float angle;
            uniform float amount;
            ${noise}

            void main() {
                vec2 offset = amount * vec2(cos(angle), sin(angle));
                vec4 cr = texture2D(tDiffuse, vUv + offset);
                vec4 cga = texture2D(tDiffuse, vUv);
                vec4 cb = texture2D(tDiffuse, vUv - offset);

                // Calculate the distance from the top and bottom edges
                float distFromEdge = min(vUv.y, 1.0 - vUv.y);
                float edgeIntensity = smoothstep(0.0, 0.1, distFromEdge);

                // Apply RGB shift only in the top and bottom 20% of the screen
                vec4 color = vec4(cr.r, cga.g, cb.b, cga.a);
                gl_FragColor = mix(color, cga, edgeIntensity);
            }
        `,
        }

        this.customPass = new ShaderPass(this.rgbShiftEffect);
        this.customPass.renderToScreen = true;
        this.composer.addPass(this.customPass);
    }


    /**
     * Create Cylinder
     */
    createCylinder() {
        // 1. Create cylinder
        this.geometry = new THREE.CylinderGeometry(
            App.Cylinder_PARAM.radiusTop,
            App.Cylinder_PARAM.radiusBottom,
            App.Cylinder_PARAM.height,
            App.Cylinder_PARAM.radialSegments,
            App.Cylinder_PARAM.heightSegments
        );

        this.material = new THREE.MeshBasicMaterial({
            wireframe: false,
            color: 0xffffff,
            transparent: true,
            opacity: 0.0,
            depthWrite: false,
            visible: false
        });
        this.cylinder = new THREE.Mesh(this.geometry, this.material);
        this.group.add(this.cylinder);

        // 2. Create plane mesh
        this.planeGeometry = new THREE.PlaneGeometry(
            App.PLANE_PARAM.planeWidth,
            App.PLANE_PARAM.planeHeight,
            20,
            20,
        );

        for (let i = 0; i < App.PLANE_PARAM.rows; i++) {
            for (let j = 0; j < App.PLANE_PARAM.columns; j++) {
                const textureIndex = i * App.PLANE_PARAM.columns + j; // 0 - 39
                const texture = this.textures[textureIndex % this.textures.length]; // each texture;

                const opacity = this.isMobile ? 0.8 : 0.5;

                this.planeMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        uTexture: { value: texture },
                        uHover: { value: false },
                        uResolution: { value: new THREE.Vector2(App.SIZE.width, App.SIZE.height) },
                        uQuadSize: { value: new THREE.Vector2(this.wrapper.offsetWidth, this.wrapper.offsetHeight) },
                        uTextureSize: { value: new THREE.Vector2(texture.image.width, texture.image.height) },
                        uCurveMax: { value: App.PLANE_CURVE_PARAM.curveMax },
                        uCurveMin: { value: App.PLANE_CURVE_PARAM.curveMin },
                        uOpacity: { value: opacity }
                    },
                    vertexShader: this.shaderSource.vertexShader,
                    fragmentShader: this.shaderSource.fragmentShader,
                    side: THREE.DoubleSide,
                    transparent: true,
                    depthWrite: false,
                    depthTest: true,
                });

                this.plane = new THREE.Mesh(
                    this.planeGeometry,
                    this.planeMaterial
                );

                // Add userData for speed and unique ID to planes
                this.plane.userData.rotationSpeed = i % 2 === 0 ? App.PLANE_ROTATION.evenRowSpeed : App.PLANE_ROTATION.oddRowSpeed;

                // プレーンの位置を計算
                const theta = (j / App.PLANE_PARAM.columns) * App.PI * 2;
                const y = App.PLANE_PARAM.rowSpacing / 2 - (i + 0.5) * (App.PLANE_PARAM.rowSpacing / App.PLANE_PARAM.rows);
                const radius = App.Cylinder_PARAM.radiusTop + 0.1; // シリンダーの半径よりわずかに大きく

                this.plane.position.set(
                    Math.cos(theta) * radius,
                    y,
                    Math.sin(theta) * radius
                );

                const scale = this.calculateScales();
                this.plane.scale.set(scale, scale, 1);

                // プレーンをシリンダーの表面に向ける
                this.plane.lookAt(0, y, 0);
                this.cylinder.add(this.plane);
                this.plane.rotateY(App.PI)
            }
        }

        this.scene.add(this.group);
    }


    /**
     * Resize
     */
    debouncedResize() {
        clearTimeout(this.resizeTimeout)
        this.resizeTimeout = setTimeout(() => {
            const scale = this.calculateScales()
            this.resizeCylinder(scale)
            this.resize()
        }, 500)
    }

    calculateScales() {
        const aspect = App.SIZE.width / App.SIZE.height;
        let scale;

        if (this.isMobile) {
            scale = App.SIZE.width / 300;
        } else if (App.SIZE.width < 1500) {
            scale = aspect > 1 ? App.SIZE.height / 800 : App.SIZE.width / 800;
        } else {
            scale = aspect > 1 ? App.SIZE.height / 1400 : App.SIZE.width / 1400;
        }

        return scale;
    }


    /**
     * Cylinderのサイズを調整
     */
    resizeCylinder(scale) {
        // Update radius & height
        const newRadius = App.Cylinder_PARAM.radiusTop * scale;
        const newHeight = App.Cylinder_PARAM.height * scale;

        this.cylinder.scale.set(scale, scale, scale);

        // Udpate plane's position based on cylinder size
        this.cylinder.children.forEach((plane, index) => {
            const row = Math.floor(index / App.PLANE_PARAM.columns);
            const col = index % App.PLANE_PARAM.columns;

            const theta = (col / App.PLANE_PARAM.columns) * App.PI * 2;
            const y = App.Cylinder_PARAM.height / 2 - (row + 0.5) * (App.Cylinder_PARAM.height / App.PLANE_PARAM.rows);
            const radius = App.Cylinder_PARAM.radiusTop + 0.1; // シリンダーの半径よりわずかに大きく

            this.plane.position.set(
                Math.cos(theta) * radius,
                y,
                Math.sin(theta) * radius
            );

        });
    }

    resize() {
        // Update canvas size
        App.SIZE.width = window.innerWidth;
        App.SIZE.height = window.innerHeight;

        // Update camera
        this.camera.aspect = App.SIZE.width / App.SIZE.height;
        this.camera.updateProjectionMatrix();

        // Update renderer
        this.renderer.setSize(App.SIZE.width, App.SIZE.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Calculate new scale
        const scale = this.calculateScales();

        // Resize cylinder and update plane positions
        this.resizeCylinder(scale);

        // Update plane materials
        if (this.cylinder && this.cylinder.children.length > 0) {

            this.cylinder.children.forEach((plane) => {

                // Update uniform: resolution, quadSize
                if (plane.material.uniforms) {
                    plane.material.uniforms.uResolution.value.set(App.SIZE.width, App.SIZE.height);
                    plane.material.uniforms.uQuadSize.value.set(App.SIZE.width, App.SIZE.height);
                }
            });
        }
    }


    /************************************************************
     * Mobile
     ************************************************************/
    touchStartEvent(event) {
        event.preventDefault();
        this.isTouching = true;
        this.touchStartY = event.touches[0].clientY;
        this.lastTouchY = this.touchStartY;
    }


    touchMoveEvent(event) {
        if (!this.isTouching) return;

        event.preventDefault();

        const touch = event.touches[0];
        const deltaY = this.lastTouchY - touch.clientY;
        this.lastTouchY = touch.clientY;

        this.handleScrolling(deltaY);

        // マウス移動イベントのシミュレート
        this.simulateMouseMove(touch.clientX, touch.clientY);
    }


    touchEndEvent(event) {
        event.preventDefault();

        this.isTouching = false;
    }


    handleScrolling(deltaY) {
        this.isWheel = true;
        this.isTouching = true;

        clearTimeout(this.wheelTimeout);

        if (this.isMobile) {
            this.newTargetY = App.WHEEL_PARAM.targetY + deltaY * 0.01;
        } else {
            this.newTargetY = App.WHEEL_PARAM.targetY + deltaY * 0.001;
        }

        // シリンダーの上端がビューポートの上端に達したかチェック
        if (this.group.position.y + App.SCROLL_RANGE.cylinderTopY <= App.SCROLL_RANGE.viewportTopY || this.newTargetY < App.WHEEL_PARAM.targetY) {
            // シリンダーの下端がビューポートの下端に達したかチェック
            if (this.group.position.y + App.SCROLL_RANGE.cylinderBottomY >= App.SCROLL_RANGE.viewportBottomY || this.newTargetY > App.WHEEL_PARAM.targetY) {
                App.WHEEL_PARAM.targetY = this.newTargetY;
            }
        }

        // スクロールイベントが終了してから0.5秒後にisWheelをfalseに設定
        this.wheelTimeout = setTimeout(() => {
            this.isWheel = false;
            this.isTouching = false;
        }, 500);
    }


    adjustForMobile() {
        if (this.isMobile) {
            // カメラの位置を調整
            App.CAMERA_PARAM.position.z = 12;

            // シリンダーのサイズを調整
            App.Cylinder_PARAM.radiusTop *= 0.7;
            App.Cylinder_PARAM.radiusBottom *= 0.7;
            App.Cylinder_PARAM.height *= 0.7;

            // プレーンのサイズを調整
            App.PLANE_PARAM.planeWidth *= 0.7;
            App.PLANE_PARAM.planeHeight *= 0.7;
            App.PLANE_PARAM.rowSpacing *= 0.7;
        }
    }


    onTouchStart(event) {
        event.preventDefault();
        this.touchStartTime = new Date().getTime();
        this.touchStartX = event.touches[0].clientX;
        this.touchStartY = event.touches[0].clientY;
    }


    onTouchEnd(event) {
        event.preventDefault();
        const touchEndTime = new Date().getTime();
        const touchEndX = event.changedTouches[0].clientX;
        const touchEndY = event.changedTouches[0].clientY;

        // タップとみなす条件（時間と移動距離）
        const touchDuration = touchEndTime - this.touchStartTime;
        const touchDistance = Math.sqrt(
            Math.pow(touchEndX - this.touchStartX, 2) +
            Math.pow(touchEndY - this.touchStartY, 2)
        );

        if (touchDuration < 300 && touchDistance < 10) {
            // タップとみなしてクリックイベントをシミュレート
            this.onClickEvent(event.changedTouches[0]);
        }
    }


    /**
     * detect mobile
     * @returns
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    /************************************************************/


    /**
     * GUI
     */
    addGUI() {
        this.gui = new GUI()

        // Add name to gui controll panel
        const planeFolder = this.gui.addFolder('plane')

        planeFolder.add(App.PLANE_CURVE_PARAM, 'curveMax').name('curveMax').min(-10).max(10).step(0.01).onChange(() => {
            this.cylinder.children.forEach(plane => {
                plane.material.uniforms.uCurveMax.value = App.PLANE_CURVE_PARAM.curveMax
            })
        })

        planeFolder.add(App.PLANE_CURVE_PARAM, 'curveMin').name('curveMin').min(-10).max(10).step(0.01).onChange(() => {
            this.cylinder.children.forEach(plane => {
                plane.material.uniforms.uCurveMin.value = App.PLANE_CURVE_PARAM.curveMin
            })
        })
    }


    /**
     * Wheel event
     */
    wheelEvent(event) {
        this.handleScrolling(event.deltaY);
        //         this.isWheel = true;
        //         clearTimeout(this.wheelTimeout);
        //
        //         const newTargetY = App.WHEEL_PARAM.targetY + event.deltaY * 0.001;
        //
        //         // シリンダーの上端がビューポートの上端に達したかチェック
        //         if (this.group.position.y + App.SCROLL_RANGE.cylinderTopY <= App.SCROLL_RANGE.viewportTopY || newTargetY < App.WHEEL_PARAM.targetY) {
        //             // シリンダーの下端がビューポートの下端に達したかチェック
        //             if (this.group.position.y + App.SCROLL_RANGE.cylinderBottomY >= App.SCROLL_RANGE.viewportBottomY || newTargetY > App.WHEEL_PARAM.targetY) {
        //                 App.WHEEL_PARAM.targetY = newTargetY;
        //             }
        //         }
        //
        //         // ホイールイベントが終了してから0.5秒後にisWheelをfalseに設定
        //         this.wheelTimeout = setTimeout(() => {
        //             this.isWheel = false;
        //         }, 600);
    }


    /**
     * Mouse move event
     */
    mouseMoveEvent(e) {
        this.simulateMouseMove(e.clientX, e.clientY);
        //         App.MOUSE.x = (e.clientX / App.SIZE.width - 0.5) * 2 / 2; // -0.5から0.5の範囲に正規化
        //         App.MOUSE.y = (e.clientY / App.SIZE.height - 0.5) * 2 / 2; // -0.5から0.5の範囲に正規化
        //
        //         this.isMouseMove = true;
        //         clearTimeout(this.mouseMoveTimeout);
        //
        //         this.mouseMoveTimeout = setTimeout(() => {
        //             this.isMouseMove = false
        //         }, 200)
        //
        //         // Raycaster
        //         this.pointer.x = (e.clientX / App.SIZE.width) * 2 - 1;
        //         this.pointer.y = - (e.clientY / App.SIZE.height) * 2 + 1;
    }


    simulateMouseMove(clientX, clientY) {
        // -0.5から0.5の範囲に正規化
        App.MOUSE.x = (clientX / App.SIZE.width - 0.5) * 2 / 2;
        App.MOUSE.y = (clientY / App.SIZE.height - 0.5) * 2 / 2;

        this.isMouseMove = true;
        clearTimeout(this.mouseMoveTimeout);

        this.mouseMoveTimeout = setTimeout(() => {
            this.isMouseMove = false
        }, 200);

        // Raycaster
        this.pointer.x = (clientX / App.SIZE.width) * 2 - 1;
        this.pointer.y = - (clientY / App.SIZE.height) * 2 + 1;
    }


    /**
    * レンダラーの描画を開始
    */
    renderStart() {
        requestAnimationFrame(() => {
            this.render()
        })
    }


    /**
     * Click
     * @param {*} event
     */
    onClickEvent(event) {
        const clientX = event.clientX || event.pageX;
        const clientY = event.clientY || event.pageY;

        this.pointer.x = (clientX / App.SIZE.width) * 2 - 1;
        this.pointer.y = - (clientY / App.SIZE.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);

        const intersects = this.raycaster.intersectObjects(this.cylinder.children);

        if (intersects.length > 0) {
            const clickedPlane = intersects[0].object;
            const clickedTexture = clickedPlane.material.uniforms.uTexture.value;
            const clickedTextureSrc = clickedTexture.image.src;

            // Get clicked image name from URL
            const clickedTextureFileName = clickedTextureSrc.split('/').pop();
            this.showModal(clickedTextureFileName);
        }
    }


    /**
     * Show modal
     * @param {} itemID
     */
    showModal(clickedTextureFileName) {
        // Find the matching plane data based on the texture file name
        const planeData = this.planeData.find(plane => plane.textureSrc.includes(clickedTextureFileName));

        if (planeData) {
            this.textureImage.src = planeData.textureSrc;
            this.titleElement.textContent = planeData.title;
            this.descriptionElement.textContent = planeData.description;
            this.infoPanel.style.transform = 'translateX(0)';
        } else {
            console.error('No matching plane data found for texture:', clickedTextureFileName);
        }
    }


    closeModal() {
        this.infoPanel.style.transform = 'translateX(100%)';

        // Reset the content
        setTimeout(() => {
            this.textureImage.src = '';
            this.titleElement.textContent = '';
            this.descriptionElement.textContent = '';
        }, 800);
    }


    /**
     * Render
     */
    render() {
        let deltaTime = this.clock.getDelta();

        // Raycaster の更新
        this.raycaster.setFromCamera(this.pointer, this.camera);

        // グループ内の全オブジェクトとの交差をチェック
        const intersects = this.raycaster.intersectObjects(this.group.children);

        // 以前ホバーしていたPlaneと現在交差しているPlaneが異なる場合の処理
        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            if (this.hoveredPlane !== intersectedObject) {
                // 以前ホバーしていたPlaneのホバー状態をFalseに設定
                if (this.hoveredPlane && this.hoveredPlane.material.uniforms && this.hoveredPlane.material.uniforms.uHover) {
                    this.hoveredPlane.material.uniforms.uHover.value = false;
                }

                // 新しくホバーしているPlaneのホバー状態をTrueに設定
                if (intersectedObject.material.uniforms && intersectedObject.material.uniforms.uHover) {
                    intersectedObject.material.uniforms.uHover.value = true;
                }

                // hoveredPlaneを更新
                this.hoveredPlane = intersectedObject;
            }
        } else {
            // 交差しているPlaneがない場合、すべてのホバー状態をリセット
            if (this.hoveredPlane && this.hoveredPlane.material.uniforms && this.hoveredPlane.material.uniforms.uHover) {
                this.hoveredPlane.material.uniforms.uHover.value = false;
            }
            this.hoveredPlane = null;
        }

        if (this.isWheel || this.isMouseMove || this.isTouching) {
            // ホイールイベントまたはマウス移動中は、1に向かって増加
            App.LERP.transitionFactor = Math.min(App.LERP.transitionFactor + App.LERP.transitionSpeed, 1);
        } else {
            // ホイールイベントもマウス移動もない場合は、0に向かって減少
            App.LERP.transitionFactor = Math.max(App.LERP.transitionFactor - App.LERP.transitionSpeed, 0);
        }

        // ホイールイベント中の動作と自動回転の補間
        const wheelRotation = (App.WHEEL_PARAM.targetY - this.group.rotation.y) * App.WHEEL_PARAM.rotationSmoothness;
        const autoRotation = - App.WHEEL_PARAM.autoRotationSpeed * deltaTime;

        // マウス移動による回転
        const mouseRotationY = App.MOUSE.x * App.MOUSE_ROTAT_PARAM.mouseRotationSpeed * 0.07;
        const mouseRotationX = App.MOUSE.y * App.MOUSE_ROTAT_PARAM.mouseYRotationSpeed * 0.05;

        // Y軸の自動回転（左右）
        this.group.rotation.y += wheelRotation * App.LERP.transitionFactor +
            mouseRotationY * App.LERP.transitionFactor +
            autoRotation * (1 - App.LERP.transitionFactor);

        // X軸の回転（上下） group rotates min 3 deg, max 3 deg
        let newRotationX = this.group.rotation.x + mouseRotationX * App.LERP.transitionFactor;
        newRotationX = Math.max(Math.min(newRotationX, App.MOUSE_ROTAT_PARAM.MAX_X_ROTATION), -App.MOUSE_ROTAT_PARAM.MAX_X_ROTATION);
        this.group.rotation.x = newRotationX;

        // Y位置の更新（ホイールスクロール）
        this.group.position.y += (App.WHEEL_PARAM.targetY - this.group.position.y) * App.WHEEL_PARAM.smoothness;

        requestAnimationFrame(this.render);
        // this.renderer.render(this.scene, this.camera);

        // Effect composer
        this.composer.render()
    }

} // App