
// = 004 ======================================================================
// このサンプルは、最初の状態では 003 とまったく同じ内容です。
// これを、みなさん自身の手で修正を加えて「描かれる図形を五角形に」してみてくだ
// さい。
// そんなの余裕じゃろ～ と思うかも知れませんが……結構最初は難しく感じる人も多い
// かもしれません。なお、正確な正五角形でなくても構いません。
// ポイントは以下の点を意識すること！
// * canvas 全体が XY 共に -1.0 ～ 1.0 の空間になっている
// * gl.TRIANGLES では頂点３個がワンセットで１枚のポリゴンになる
// * つまりいくつかの頂点は「まったく同じ位置に重複して配置される」ことになる
// * 頂点座標だけでなく、頂点カラーも同じ個数分必要になる
// * 物足りない人は、星型や円形などに挑戦してみてもいいかもしれません
// ============================================================================

// モジュールを読み込み
import { WebGLUtility } from '../lib/webgl.js';

// ドキュメントの読み込みが完了したら実行されるようイベントを設定する
window.addEventListener('DOMContentLoaded', async () => {
  // アプリケーションのインスタンスを初期化し、必要なリソースをロードする
  const app = new App();
  app.init();
  await app.load();
  // ロードが終わったら各種セットアップを行う
  app.setupGeometry();
  app.setupLocation();
  // すべてのセットアップが完了したら描画を開始する
  app.start();
}, false);

/**
 * アプリケーション管理クラス
 */
class App {
  canvas;             // WebGL で描画を行う canvas 要素
  gl;                 // WebGLRenderingContext （WebGL コンテキスト）
  program;            // WebGLProgram （プログラムオブジェクト）
  position;           // 頂点の座標情報を格納する配列
  positionStride;     // 頂点の座標のストライド
  positionVBO;        // 頂点座標の VBO
  starPosition;       // 星型頂点の座標情報を格納する配列
  starPositionStride; // 頂点の座標のストライド
  starPositionVBO;    // 星型頂点座標の VBO
  color;              // 頂点カラーの座標情報を格納する配列
  colorStride;        // 頂点カラーの座標のストライド
  colorVBO;           // 頂点カラー座標の VBO
  uniformLocation;    // uniform 変数のロケーション
  startTime;          // レンダリング開始時のタイムスタンプ
  isRendering;        // レンダリングを行うかどうかのフラグ

  constructor() {
    // this を固定するためのバインド処理
    this.render = this.render.bind(this);
  }

  /**
   * 初期化処理を行う
   */
  init() {
    // canvas エレメントの取得と WebGL コンテキストの初期化
    this.canvas = document.getElementById('webgl-canvas');
    this.gl = WebGLUtility.createWebGLContext(this.canvas);

    // canvas のサイズを設定
    const size = Math.min(window.innerWidth, window.innerHeight);
    this.canvas.width  = size;
    this.canvas.height = size;
  }

  /**
   * 各種リソースのロードを行う
   * @return {Promise}
   */
  load() {
    return new Promise(async (resolve, reject) => {
      // 変数に WebGL コンテキストを代入しておく（コード記述の最適化）
      const gl = this.gl;
      // WebGL コンテキストがあるかどうか確認する
      if (gl == null) {
        // もし WebGL コンテキストがない場合はエラーとして Promise を reject する
        const error = new Error('not initialized');
        reject(error);
      } else {
        // まずシェーダのソースコードを読み込む
        const VSSource = await WebGLUtility.loadFile('./main.vert');
        const FSSource = await WebGLUtility.loadFile('./main.frag');
        // 無事に読み込めたらシェーダオブジェクトの実体を生成する
        const vertexShader = WebGLUtility.createShaderObject(gl, VSSource, gl.VERTEX_SHADER);
        const fragmentShader = WebGLUtility.createShaderObject(gl, FSSource, gl.FRAGMENT_SHADER);
        // プログラムオブジェクトを生成する
        this.program = WebGLUtility.createProgramObject(gl, vertexShader, fragmentShader);
        resolve();
      }
    });
  }

  /**
   * 頂点属性（頂点ジオメトリ）のセットアップを行う
   */
  setupGeometry() {
    // 五角形
    this.position = [];
    this.starPosition = [];
    this.color = [];
    for( let i=0;i<5;i++ ) {
      const x1 = Math.cos((360 / 5 * i + 90) * Math.PI / 180) * 0.5;
      const y1 = Math.sin((360 / 5 * i + 90) * Math.PI / 180) * 0.5;
      const x2 = Math.cos((360 / 5 * (i + 1) + 90) * Math.PI / 180) * 0.5;
      const y2 = Math.sin((360 / 5 * (i + 1) + 90) * Math.PI / 180) * 0.5;
      this.position.push(0, 0, 0);
      this.position.push(x1, y1, 0);
      this.position.push((x2 + x1) / 2, (y2 + y1) / 2, 0);
      this.starPosition.push(0, 0, 0);
      this.starPosition.push(x1, y1, 0);
      this.starPosition.push((x2 + x1) * 1.2, (y2 + y1) * 1.2, 0);
      this.color.push(1.0, 0.0, 0.0, 1.0);
      this.color.push(0.0, 1.0, 0.0, 1.0);
      this.color.push(0.0, 0.0, 1.0, 1.0);
      this.position.push(0, 0, 0);
      this.position.push(x2, y2, 0);
      this.position.push((x2 + x1) / 2, (y2 + y1) / 2, 0);
      this.starPosition.push(0, 0, 0);
      this.starPosition.push(x2, y2, 0);
      this.starPosition.push((x2 + x1) * 1.2, (y2 + y1) * 1.2, 0);
      this.color.push(1.0, 0.0, 0.0, 1.0);
      this.color.push(0.0, 1.0, 0.0, 1.0);
      this.color.push(0.0, 0.0, 1.0, 1.0);
    }
    this.positionStride = 3;
    this.positionVBO = WebGLUtility.createVBO(this.gl, this.position);
    this.starPositionStride = 3;
    this.starPositionVBO = WebGLUtility.createVBO(this.gl, this.starPosition);
    this.colorStride = 4;
    this.colorVBO = WebGLUtility.createVBO(this.gl, this.color);
  }

  /**
   * 頂点属性のロケーションに関するセットアップを行う
   */
  setupLocation() {
    const gl = this.gl;
    // attribute location の取得
    const positionAttributeLocation = gl.getAttribLocation(this.program, 'position');
    const starPositionAttributeLocation = gl.getAttribLocation(this.program, 'starPosition');
    const colorAttributeLocation = gl.getAttribLocation(this.program, 'color');
    const vboArray = [this.positionVBO, this.starPositionVBO, this.colorVBO];
    const attributeLocationArray = [positionAttributeLocation, starPositionAttributeLocation, colorAttributeLocation];
    const strideArray = [this.positionStride, this.starPositionStride, this.colorStride];
    // 頂点情報の有効化
    WebGLUtility.enableBuffer(gl, vboArray, attributeLocationArray, strideArray);
    // uniform location の取得
    this.uniformLocation = {
      time: gl.getUniformLocation(this.program, 'time'),
    };
  }

  /**
   * レンダリングのためのセットアップを行う
   */
  setupRendering() {
    const gl = this.gl;
    // ビューポートを設定する
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // クリアする色を設定する（RGBA で 0.0 ～ 1.0 の範囲で指定する）
    gl.clearColor(0.3, 0.3, 0.3, 0);
    // 実際にクリアする（gl.COLOR_BUFFER_BIT で色をクリアしろ、という指定になる）
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /**
   * 描画を開始する
   */
  start() {
    // レンダリング開始時のタイムスタンプを取得しておく
    this.startTime = Date.now();
    // レンダリングを行っているフラグを立てておく
    this.isRendering = true;
    // レンダリングの開始
    this.render();
  }

  /**
   * 描画を停止する
   */
  stop() {
    this.isRendering = false;
  }

  /**
   * レンダリングを行う
   */
  render() {
    const gl = this.gl;

    // レンダリングのフラグの状態を見て、requestAnimationFrame を呼ぶか決める
    if (this.isRendering === true) {
      requestAnimationFrame(this.render);
    }

    // ビューポートの設定やクリア処理は毎フレーム呼び出す
    this.setupRendering();

    // 現在までの経過時間を計算し、秒単位に変換する
    const nowTime = (Date.now() - this.startTime) * 0.001;

    // プログラムオブジェクトを選択
    gl.useProgram(this.program);

    // ロケーションを指定して、uniform 変数の値を更新する（GPU に送る）
    gl.uniform1f(this.uniformLocation.time, nowTime);

    // ドローコール（描画命令）
    gl.drawArrays(gl.TRIANGLES, 0, this.position.length / this.positionStride);
  }
}
