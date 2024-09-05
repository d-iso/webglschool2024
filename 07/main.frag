precision mediump float;

uniform float time;
uniform bool second;
uniform sampler2D textureUnit0;
uniform sampler2D textureUnit1;

varying vec4 vColor;
varying vec2 vTexCoord;

float x;

void main() {
  x = vTexCoord.x - time + 1.0;
  x = x > 1.0 ? 1.0 : x;
  x = x < 0.0 ? 0.0 : x;
  if( second ) {
    x = abs(x - 1.0);
  }
  vec4 textureColor = mix(texture2D(textureUnit0, vTexCoord), texture2D(textureUnit1, vTexCoord), x);

  gl_FragColor = vColor * textureColor;
}

