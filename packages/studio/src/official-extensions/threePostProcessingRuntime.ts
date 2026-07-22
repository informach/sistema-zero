/**
 * Bloco compartilhado de shaders usado pelos runtimes oficiais baseados em Three.
 *
 * Os runtimes são strings de JavaScript executadas dentro do iframe. O marcador
 * mantém essas strings literais e auditáveis, enquanto esta composição impede que
 * os mesmos shaders evoluam de forma diferente entre as extensões 3D.
 */
export const THREE_POST_PROCESSING_MARKER = '/*__SZ_THREE_POST_PROCESSING_SHADERS__*/'

const THREE_POST_PROCESSING_SOURCE = `
  var DOWNSAMPLE_FSH = [
    'uniform sampler2D frameTexture;',
    'uniform bool useKaris;',
    'uniform vec2 resolution;',
    'varying vec2 vUvs;',
    'float Luminance(vec4 c) { return max(1.0, dot(c.xyz, vec3(0.2627, 0.6780, 0.0593))); }',
    'vec4 KarisAverage(vec4 s1, vec4 s2, vec4 s3, vec4 s4) {',
    '  float w1 = 1.0 / Luminance(s1);',
    '  float w2 = 1.0 / Luminance(s2);',
    '  float w3 = 1.0 / Luminance(s3);',
    '  float w4 = 1.0 / Luminance(s4);',
    '  float totalWeight = 1.0 / (w1 + w2 + w3 + w4);',
    '  return (s1 * w1 + s2 * w2 + s3 * w3 + s4 * w4) * totalWeight;',
    '}',
    'void main() {',
    '  vec2 texelSize = 1.0 / resolution;',
    '  vec4 A = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, -1.0));',
    '  vec4 B = texture2D(frameTexture, vUvs + texelSize * vec2(0.0, -1.0));',
    '  vec4 C = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, -1.0));',
    '  vec4 D = texture2D(frameTexture, vUvs + texelSize * vec2(-0.5, -0.5));',
    '  vec4 E = texture2D(frameTexture, vUvs + texelSize * vec2(0.5, -0.5));',
    '  vec4 F = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, 0.0));',
    '  vec4 G = texture2D(frameTexture, vUvs);',
    '  vec4 H = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, 0.0));',
    '  vec4 I = texture2D(frameTexture, vUvs + texelSize * vec2(-0.5, 0.5));',
    '  vec4 J = texture2D(frameTexture, vUvs + texelSize * vec2(0.5, 0.5));',
    '  vec4 K = texture2D(frameTexture, vUvs + texelSize * vec2(-1.0, 1.0));',
    '  vec4 L = texture2D(frameTexture, vUvs + texelSize * vec2(0.0, 1.0));',
    '  vec4 M = texture2D(frameTexture, vUvs + texelSize * vec2(1.0, 1.0));',
    '  vec2 div = vec2(0.5, 0.125);',
    '  vec4 colour = vec4(0.0);',
    '  if (useKaris) {',
    '    colour = KarisAverage(D, E, I, J) * div.x;',
    '    colour += KarisAverage(A, B, G, F) * div.y;',
    '    colour += KarisAverage(B, C, H, G) * div.y;',
    '    colour += KarisAverage(F, G, L, K) * div.y;',
    '    colour += KarisAverage(G, H, M, L) * div.y;',
    '  } else {',
    '    div *= 0.25;',
    '    colour = (D + E + I + J) * div.x;',
    '    colour += (A + B + G + F) * div.y;',
    '    colour += (B + C + H + G) * div.y;',
    '    colour += (F + G + L + K) * div.y;',
    '    colour += (G + H + M + L) * div.y;',
    '  }',
    '  gl_FragColor = colour;',
    '}'
  ].join(' ');

  var UPSAMPLE_FSH = [
    'uniform sampler2D frameTexture;',
    'uniform sampler2D mipTexture;',
    'uniform vec2 resolution;',
    'varying vec2 vUvs;',
    'void main() {',
    '  float x = 1.0 / resolution.x;',
    '  float y = 1.0 / resolution.y;',
    '  vec4 a = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y + y));',
    '  vec4 b = texture2D(frameTexture, vec2(vUvs.x, vUvs.y + y));',
    '  vec4 c = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y + y));',
    '  vec4 d = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y));',
    '  vec4 e = texture2D(frameTexture, vec2(vUvs.x, vUvs.y));',
    '  vec4 f = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y));',
    '  vec4 g = texture2D(frameTexture, vec2(vUvs.x - x, vUvs.y - y));',
    '  vec4 h = texture2D(frameTexture, vec2(vUvs.x, vUvs.y - y));',
    '  vec4 i = texture2D(frameTexture, vec2(vUvs.x + x, vUvs.y - y));',
    '  vec4 colour = e * 4.0;',
    '  colour += (b + d + f + h) * 2.0;',
    '  colour += (a + c + g + i);',
    '  colour *= 1.0 / 16.0;',
    '  colour += texture2D(mipTexture, vUvs);',
    '  gl_FragColor = colour;',
    '}'
  ].join(' ');

  var COMPOSITE_FSH = [
    'uniform sampler2D frameTexture;',
    'uniform sampler2D bloomTexture;',
    'uniform float bloomStrength;',
    'uniform float bloomMix;',
    'varying vec2 vUvs;',
    'void main() {',
    '  vec4 textureSample = texture2D(frameTexture, vUvs);',
    '  vec4 bloomSample = texture2D(bloomTexture, vUvs);',
    '  gl_FragColor = mix(textureSample, bloomStrength * bloomSample, bloomMix);',
    '}'
  ].join(' ');

  var FINAL_FSH = [
    'uniform sampler2D tDiffuse;',
    'uniform float intensity;',
    'uniform float dropoff;',
    'varying vec2 vUvs;',
    'float inverseLerp(float v, float minValue, float maxValue) {',
    '  return (v - minValue) / (maxValue - minValue);',
    '}',
    'float remap(float v, float inMin, float inMax, float outMin, float outMax) {',
    '  float t = inverseLerp(v, inMin, inMax);',
    '  return mix(outMin, outMax, t);',
    '}',
    'float vignette(vec2 uvs) {',
    '  float v1 = smoothstep(0.5, 0.3, abs(uvs.x - 0.5));',
    '  float v2 = smoothstep(0.5, 0.3, abs(uvs.y - 0.5));',
    '  float v = v1 * v2;',
    '  v = pow(v, dropoff);',
    '  v = remap(v, 0.0, 1.0, intensity, 1.0);',
    '  return v;',
    '}',
    'vec3 RRTAndODTFit(vec3 v) {',
    '  vec3 a = v * (v + 0.0245786) - 0.000090537;',
    '  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;',
    '  return a / b;',
    '}',
    'vec3 aces(vec3 color) {',
    '  mat3 mIn = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);',
    '  mat3 mOut = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);',
    '  color *= 1.0 / 0.6;',
    '  color = mIn * color;',
    '  color = RRTAndODTFit(color);',
    '  color = mOut * color;',
    '  return clamp(color, 0.0, 1.0);',
    '}',
    'void main() {',
    '  vec4 texel = texture2D(tDiffuse, vUvs);',
    '  vec3 col = texel.xyz * vignette(vUvs);',
    '  col = aces(col);',
    '  col = pow(col, vec3(0.4545));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join(' ');
`.trim()

export function withThreePostProcessingRuntime(source: string): string {
  const firstMarker = source.indexOf(THREE_POST_PROCESSING_MARKER)
  if (firstMarker === -1) {
    throw new Error('Runtime 3D sem o marcador de pós-processamento compartilhado')
  }
  if (source.indexOf(THREE_POST_PROCESSING_MARKER, firstMarker + 1) !== -1) {
    throw new Error('Runtime 3D com marcador de pós-processamento duplicado')
  }
  return source.replace(THREE_POST_PROCESSING_MARKER, THREE_POST_PROCESSING_SOURCE)
}
