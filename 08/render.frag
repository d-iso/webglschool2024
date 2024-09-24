precision mediump float;

uniform float cursorX;
uniform float cursorY;
uniform sampler2D textureUnit;
uniform float noiseDistortion; // ノイズの歪み係数値 @@@
uniform vec2 resolution; // スクリーンの解像度
uniform float time;
varying vec2 vTexCoord;

const float INVERSE3 = 1.0 / 3.0;
const int   OCT      = 8;         // オクターブ
const float PST      = 0.5;       // パーセンテージ
const float PI       = 3.1415926; // 円周率

// 補間関数
float interpolate(float a, float b, float x){
    float f = (1.0 - cos(x * PI)) * 0.5;
    return a * (1.0 - f) + b * f;
}

// 乱数生成器（その２）
float rnd(vec2 n){
  float a  = 0.129898;
  float b  = 0.78233;
  float c  = 437.585453;
  float dt = dot(n ,vec2(a, b));
  float sn = mod(dt, 3.14);
  return fract(sin(sn) * c);
}

// 補間＋乱数
float irnd(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec4 v = vec4(rnd(vec2(i.x,       i.y      )),
                rnd(vec2(i.x + 1.0, i.y      )),
                rnd(vec2(i.x,       i.y + 1.0)),
                rnd(vec2(i.x + 1.0, i.y + 1.0)));
  return interpolate(interpolate(v.x, v.y, f.x), interpolate(v.z, v.w, f.x), f.y);
}
// ノイズ
float noise(vec2 p){
  float t = 0.0;
  for(int i = 0; i < OCT; i++){
    float freq = pow(2.0, float(i));
    float amp  = pow(PST, float(OCT - i));
    t += irnd(vec2(p.x / freq, p.y / freq)) * amp;
  }
  return t;
}
// シームレスノイズ
float snoise(vec2 p, vec2 q, vec2 r){
  return noise(vec2(p.x,       p.y      )) *        q.x  *        q.y  +
         noise(vec2(p.x,       p.y + r.y)) *        q.x  * (1.0 - q.y) +
         noise(vec2(p.x + r.x, p.y      )) * (1.0 - q.x) *        q.y  +
         noise(vec2(p.x + r.x, p.y + r.y)) * (1.0 - q.x) * (1.0 - q.y);
}

void main() {
  float s = snoise(gl_FragCoord.st + time * 20.0, vTexCoord, resolution);

  float n = s * 2.0 - 1.0;

  vec2 coord = vTexCoord;
  float distanceX = cursorX - vTexCoord.x;
  float distanceY = (cursorY - vTexCoord.y) * resolution.y / resolution.x;
  float distance = length(vec2(distanceX, distanceY));
  if(
    distance < 0.1
  ) {
    float diff = 0.1 - distance;
    coord = (vTexCoord * 2.0 - 1.0) + n * 20.0 * diff;
    coord = coord * 0.5 + 0.5;
  }

  vec4 samplerColor = texture2D(textureUnit, coord);

  gl_FragColor = samplerColor;
}


