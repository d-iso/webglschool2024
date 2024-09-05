import { WebGLUtility } from '../lib/webgl.js';
import { Vec3, Mat4 } from '../lib/math.js';
import { WebGLOrbitCamera } from '../lib/camera.js';
import { WebGLGeometry } from '../lib/geometry.js';

class App {
  canvas;
  gl;
  program;
  camera;
  texture1;
  texture2;
  isRendering;
  planeGeometry;
  planeVBO;
  planeIBO;
  attributeLocation;
  attributeStride;
  uniformLocation;
  startTime;

  constructor(){
    this.resize = this.resize.bind(this);
    this.render = this.render.bind(this);
  }

  init(){
    this.canvas = document.getElementById('webgl-canvas');
    this.gl = WebGLUtility.createWebGLContext(this.canvas);

    const cameraOption = {
      distance: 5.0,
      min: 1.0,
      max: 10.0,
      move: 2.0,
    };
    this.camera = new WebGLOrbitCamera(this.canvas, cameraOption);

    this.resize();
    window.addEventListener('resize', this.resize, false);
  }

  load(){
    return new Promise(async (resolve, reject) => {
      const gl = this.gl;
      if (gl == null) {
        const error = new Error('not initialized');
        reject(error);
      } else {
        const VSSource = await WebGLUtility.loadFile('./main.vert');
        const FSSource = await WebGLUtility.loadFile('./main.frag');
        const vertexShader = WebGLUtility.createShaderObject(gl, VSSource, gl.VERTEX_SHADER);
        const fragmentShader = WebGLUtility.createShaderObject(gl, FSSource, gl.FRAGMENT_SHADER);
        this.program = WebGLUtility.createProgramObject(gl, vertexShader, fragmentShader);
        const image1 = await WebGLUtility.loadImage('./image1.jpg');
        this.texture1 = WebGLUtility.createTexture(gl, image1);
        const image2 = await WebGLUtility.loadImage('./image2.jpg');
        this.texture2 = WebGLUtility.createTexture(gl, image2);
        resolve();
      }
    });
  }

  resize(){
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setup(){
    // geometory
    const w = 4.0;
    const color = [1.0, 1.0, 1.0, 1.0];
    this.planeGeometry = WebGLGeometry.plane(w, w * 9 / 16, color);
    this.planeVBO = [
      WebGLUtility.createVBO(this.gl, this.planeGeometry.position),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.color),
      WebGLUtility.createVBO(this.gl, this.planeGeometry.texCoord),
    ];
    this.planeIBO = WebGLUtility.createIBO(this.gl, this.planeGeometry.index);

    // location
    const gl = this.gl;
    this.attributeLocation = [
      gl.getAttribLocation(this.program, 'position'),
      gl.getAttribLocation(this.program, 'color'),
      gl.getAttribLocation(this.program, 'texCoord'),
    ];
    this.attributeStride = [
      3,
      4,
      2,
    ];
    this.uniformLocation = {
      second: gl.getUniformLocation(this.program, 'second'),
      time: gl.getUniformLocation(this.program, 'time'),
      mvpMatrix: gl.getUniformLocation(this.program, 'mvpMatrix'),
      textureUnit0: gl.getUniformLocation(this.program, 'textureUnit0'),
      textureUnit1: gl.getUniformLocation(this.program, 'textureUnit1'),
    };
  }

  setupRendering(){
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.3, 0.3, 0.3, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  start(){
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texture2);
    this.isRendering = true;
    this.startTime = Date.now();
    this.render();
  }

  render(){
    const gl = this.gl;
    if( this.isRendering ) {
      requestAnimationFrame(this.render);
    }
    this.setupRendering();

    const m = Mat4.identity();
    const v = this.camera.update();
    const fovy = 45;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1
    const far = 10.0;
    const p = Mat4.perspective(fovy, aspect, near, far);
    const vp = Mat4.multiply(p, v);
    const mvp = Mat4.multiply(vp, m);
    const time = Date.now() - this.startTime + 2000;
    const second = (Math.floor(time/1000 / 4) % 2 == 0)? false : true;

    gl.useProgram(this.program);
    gl.uniform1f(this.uniformLocation.second, second);
    gl.uniform1f(this.uniformLocation.time, time % 4000 * 0.001);
    gl.uniformMatrix4fv(this.uniformLocation.mvpMatrix, false, mvp);
    gl.uniform1i(this.uniformLocation.textureUnit0, 0);
    gl.uniform1i(this.uniformLocation.textureUnit1, 1);

    WebGLUtility.enableBuffer(gl, this.planeVBO, this.attributeLocation, this.attributeStride, this.planeIBO);
    gl.drawElements(gl.TRIANGLES, this.planeGeometry.index.length, gl.UNSIGNED_SHORT, 0);
  }
}

(async ()=>{
	const app = new App();
  app.init();
  await app.load();
  app.setup();
  app.start();
})();
