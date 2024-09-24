precision mediump float;

uniform vec3 lightVector;
uniform sampler2D textureUnit;
varying vec3 vNormal;
varying vec2 vTexCoord;

void main() {
  // テクスチャの色
  vec4 samplerColor = texture2D(textureUnit, vTexCoord);
  // 平行光源による拡散光
  vec3 light = normalize(lightVector);
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(light, normal), 0.0) * 0.5 + 0.5;
  // テクスチャの色と拡散光の合成
  gl_FragColor = samplerColor * vec4(vec3(diffuse), 1.0);
}

