
attribute vec3 position;
attribute vec2 texCoord;
varying vec2 vTexCoord;

void main() {
  // フレームバッファの描画結果は左下原点なので、上下だけ反転させる
  vTexCoord = vec2(texCoord.s, 1.0 - texCoord.t);
  // 画面にぴったりはめこみしたいだけなので、-1.0 ~ 1.0 の範囲で定義された
  // 板ポリゴンのジオメトリであれば、一切行列による変換はする必要がない
  gl_Position = vec4(position, 1.0);
}
