
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
uniform mat4 mvpMatrix;
uniform mat4 normalMatrix;

varying vec3 vNormal;
varying vec4 vColor;
varying mat4 vNormalMatrix;

void main() {
  vNormal = (normalMatrix * vec4(normal, 0.0)).xyz;
  vColor = color;

  gl_Position = mvpMatrix * vec4(position, 1.0);
}

