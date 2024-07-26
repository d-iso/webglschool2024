precision mediump float;

varying vec3 vNormal;
varying vec4 vColor;

const vec3 light = vec3(1.0, 1.0, 1.0);

void main() {
  float d = dot(normalize(vNormal), normalize(light));

  gl_FragColor = vec4(vColor.rgb * d, vColor.a);
}

