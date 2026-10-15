export const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

export const earthFragment = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uOcean;
  uniform vec3 uSun;
  uniform vec3 uCamera;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(uCamera - vPosW);
    float sun = dot(N, uSun);
    float daylight = smoothstep(-0.12, 0.22, sun);
    float dusk = smoothstep(-0.25, 0.05, sun) * (1.0 - smoothstep(0.05, 0.35, sun));

    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 nightTex = texture2D(uNight, vUv).rgb;
    float ocean = texture2D(uOcean, vUv).r;

    // Night side: deep blue ground, warm city lights that fade out in daylight.
    float lum = dot(nightTex, vec3(0.299, 0.587, 0.114));
    vec3 lights = pow(nightTex, vec3(0.85)) * vec3(1.6, 1.25, 0.85) * 1.9;
    vec3 nightGround = vec3(0.012, 0.02, 0.05) + lights;
    nightGround += vec3(0.01, 0.03, 0.08) * ocean;

    // Day side: lit with a soft terminator, warm at the edge.
    vec3 lit = day * (0.25 + 0.95 * max(sun, 0.0));
    lit = mix(lit, lit * vec3(1.15, 0.9, 0.7), dusk * 0.6);

    // Ocean specular from the sun.
    vec3 H = normalize(uSun + V);
    float spec = pow(max(dot(N, H), 0.0), 60.0) * ocean * daylight;
    lit += spec * vec3(1.0, 0.9, 0.75) * 0.6;

    vec3 color = mix(nightGround, lit, daylight);

    // Thin atmosphere at the limb, sky blue by day and faint by night.
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 sky = mix(vec3(0.06, 0.12, 0.30), vec3(0.45, 0.65, 1.0), daylight);
    color += sky * rim * (0.35 + 0.65 * daylight);

    gl_FragColor = vec4(color, 1.0);
  }
`

export const cloudVertex = earthVertex

export const cloudFragment = /* glsl */ `
  uniform sampler2D uClouds;
  uniform vec3 uSun;
  uniform vec3 uCamera;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(uCamera - vPosW);
    float sun = dot(N, uSun);
    float daylight = smoothstep(-0.1, 0.25, sun);
    vec2 uv = vec2(vUv.x + uTime * 0.0006, vUv.y);
    float c = texture2D(uClouds, uv).r;
    float a = smoothstep(0.18, 0.9, c);
    // Clouds are white by day, barely-there blue-grey by night (moonlit).
    vec3 col = mix(vec3(0.10, 0.13, 0.20), vec3(1.0, 0.98, 0.95) * (0.55 + 0.6 * max(sun, 0.0)), daylight);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    gl_FragColor = vec4(col, a * (0.85 - 0.5 * rim) * mix(0.35, 1.0, daylight));
  }
`

export const haloVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

export const haloFragment = /* glsl */ `
  uniform vec3 uSunView;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // Back faces of a slightly larger sphere: d goes from -1 (behind the planet) to 0 at the silhouette.
    float d = dot(vNormal, vView);
    float t = clamp((1.0 + d - 0.55) / 0.45, 0.0, 1.0);
    float glow = pow(1.0 - t, 2.6);
    float lit = smoothstep(-0.3, 0.4, dot(normalize(vNormal), uSunView));
    vec3 dayCol = vec3(0.45, 0.70, 1.0);
    vec3 nightCol = vec3(0.10, 0.18, 0.45);
    vec3 col = mix(nightCol, dayCol, lit);
    gl_FragColor = vec4(col, glow * mix(0.35, 0.9, lit));
  }
`
