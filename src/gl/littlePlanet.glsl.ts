export const quadVS = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main(){
  v_uv = a_pos*0.5+0.5; // [-1,1] -> [0,1]
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const littlePlanetFS = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D uEqui;  // equirectangular texture
uniform vec2 uEquiSize;

uniform sampler2D uLogo;
uniform vec2 uLogoSize;
uniform bool uHasLogo;

uniform float uZoom;     // overall zoom (scale on plane)
uniform vec3 uYawPitchRoll; // degrees

uniform vec2 uLogoPos;   // [-1,1] plane offset
uniform float uLogoScale; // scale relative to plane radius
uniform float uLogoRotDeg; // degrees
uniform float uLogoOpacity; // 0..1

// Convert degrees to radians
float rads(float d){ return d * 3.1415926535897932384626433832795 / 180.0; }

mat3 rotX(float a){
  float c=cos(a), s=sin(a);
  return mat3(1.0,0.0,0.0,  0.0,c,-s,  0.0,s,c);
}
mat3 rotY(float a){
  float c=cos(a), s=sin(a);
  return mat3(c,0.0,s,  0.0,1.0,0.0,  -s,0.0,c);
}
mat3 rotZ(float a){
  float c=cos(a), s=sin(a);
  return mat3(c,-s,0.0,  s,c,0.0,  0.0,0.0,1.0);
}

// Inverse stereographic mapping from plane (center=nadir) to unit sphere dir
// Plane coords p in [-1,1]^2 scaled by uZoom.
vec3 planeToDir(vec2 p){
  // Flip Y so UI Y+ goes up
  p.y = -p.y;
  p /= max(0.0001, uZoom);
  float r2 = dot(p,p);
  // Map so center is nadir (0,-1,0) looking down: use stereographic from south pole
  // Start with standard stereographic from north pole (maps center to north), then rotate 180 around X to swap
  float denom = 1.0 + r2;
  vec3 n = vec3( 2.0*p.x/denom, 2.0*p.y/denom, ( -1.0 + r2)/denom );
  // Rotate 180deg around X to swap north<->south so center becomes nadir
  n = rotX(3.14159265358979323846) * n;
  // Apply yaw/pitch/roll (Z-X-Y order or Z-Y-X; choose Yaw(Z), Pitch(X), Roll(Y) common camera-ish)
  float yaw = rads(uYawPitchRoll.x);
  float pitch = rads(uYawPitchRoll.y);
  float roll = rads(uYawPitchRoll.z);
  mat3 R = rotZ(yaw) * rotX(pitch) * rotY(roll);
  return normalize(R * n);
}

// Sample equirectangular using direction
vec3 sampleEqui(vec3 dir){
  // dir: x right, y up, z forward
  float theta = atan(dir.z, dir.x); // [-pi,pi]
  float phi = asin(clamp(dir.y, -1.0, 1.0)); // [-pi/2,pi/2]
  float u = (theta + 3.14159265358979323846) / (2.0*3.14159265358979323846);
  float v = (3.14159265358979323846/2.0 - phi) / 3.14159265358979323846;
  return texture(uEqui, vec2(u,v)).rgb;
}

// Logo overlay sampled in plane space (v_uv -> plane [-1,1])
vec4 sampleLogo(vec2 uv){
  if(!uHasLogo) return vec4(0.0);
  // Convert uv to plane coords [-1,1]
  vec2 p = uv*2.0 - 1.0;
  // translate by uLogoPos
  p -= uLogoPos;
  // rotate by -rot (apply inverse to query source)
  float a = -rads(uLogoRotDeg);
  float c = cos(a), s = sin(a);
  p = mat2(c,-s,s,c)*p;
  // scale relative to radius 1
  p /= max(0.0001, uLogoScale);
  // map plane coords to logo uv [0,1] with fit inside unit square
  // assume logo logical size 1 covers [-0.5,0.5]^2
  vec2 luv = p * vec2(-1.0, 1.0) + 0.5; // Flip X axis to fix mirroring
  // Feather mask to blend edges
  float feather = 1.0 - smoothstep(0.48, 0.5, max(abs(p.x), abs(p.y)));
  vec4 L = texture(uLogo, luv);
  L.a *= feather * uLogoOpacity;
  return L;
}

void main(){
  // map screen uv -> plane [-1,1]
  vec2 p = v_uv*2.0 - 1.0;
  vec3 dir = planeToDir(p);
  vec3 col = sampleEqui(dir);

  vec4 logo = sampleLogo(v_uv);
  // simple over
  vec3 outRgb = mix(col, logo.rgb, logo.a);
  outColor = vec4(outRgb, 1.0);
}
`;
