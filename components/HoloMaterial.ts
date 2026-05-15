import * as THREE from 'three';

const noiseShaderChunks = `
  // --- Simplex Noise ---
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - 0.5;
    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  // --- Cellular/Voronoi Noise ---
  vec3 random3(vec3 c) {
      float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
      vec3 r;
      r.z = fract(512.0*j);
      j *= .125;
      r.x = fract(512.0*j);
      j *= .125;
      r.y = fract(512.0*j);
      return r-0.5;
  }

  float cellular(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      float F1 = 1.0;
      for(int k=-1; k<=1; k++) {
          for(int j=-1; j<=1; j++) {
              for(int i1=-1; i1<=1; i1++) {
                  vec3 g = vec3(float(i1),float(j),float(k));
                  vec3 o = random3(i + g);
                  vec3 r = g - f + o + 0.5;
                  float d = dot(r,r);
                  if(d < F1) {
                      F1 = d;
                  }
              }
          }
      }
      return sqrt(F1);
  }
`;

export const createHoloMaterial = () => new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        meshScale: { value: 1.0 },
        color1: { value: new THREE.Color('#b3a0e5').convertSRGBToLinear() },
        color2: { value: new THREE.Color('#AFBCFF').convertSRGBToLinear() },
        color3: { value: new THREE.Color('#FEC2FF').convertSRGBToLinear() },
        color4: { value: new THREE.Color('#FEC2FF').convertSRGBToLinear() },
        color5: { value: new THREE.Color('#F3EBFF').convertSRGBToLinear() },
    },
    vertexShader: `
        ${noiseShaderChunks}
        #include <skinning_pars_vertex>
        
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
            vUv = uv;
            
            #include <beginnormal_vertex>
            #include <skinbase_vertex>
            #include <skinnormal_vertex>
            #include <defaultnormal_vertex>
            
            vNormal = normalize(transformedNormal);
            
            #include <begin_vertex>
            #include <skinning_vertex>
            #include <project_vertex>
            
            vPosition = transformed;
            vViewPosition = -mvPosition.xyz;
        }
    `,
    fragmentShader: `
        ${noiseShaderChunks}
        
        uniform float time;
        uniform float meshScale;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        uniform vec3 color4;
        uniform vec3 color5;

        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
            vec3 scaledPos = vPosition * meshScale;
            vec3 viewDir = normalize(vViewPosition);

            // --- 1. Main Color (Metallic Warping + Overlay + Voronoi) ---
            
            vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
            float diffuse = max(dot(vNormal, lightDir), 0.0);
            float viewReflect = max(dot(reflect(-lightDir, vNormal), viewDir), 0.0);
            
            // Enhanced metallic shine with stronger specular highlights
            float metallicSim = diffuse * 0.3 + pow(viewReflect, 0.5) * 0.5;

            float voronoiVal = cellular(scaledPos * 128.0 + (time * 0.1));
            float linearLight = clamp(metallicSim + (voronoiVal - 0.5) * 0.15, 0.0, 1.0);

            // Z-Axis mapping
            float baseGradient = clamp(vPosition.y * 0.25 + 0.5, 0.0, 0.6);

            // Overlay Blend Mode 
            float mixVal;
            if (baseGradient < 0.1) {
                mixVal = 2.0 * baseGradient * linearLight;
            } else {
                mixVal = 1.0 - 2.0 * (1.0 - baseGradient) * (0.9 - linearLight);
            }
            mixVal = clamp(mixVal, 0.0, 1.0);

            // F. THE CRUNCH 
            // reduce the harsh compression so values stay in a more natural range
            mixVal = smoothstep(0.0, 1.75, mixVal);

            // G. Mapped Gradient Color Ramp
            vec3 finalColor = mix(color1, color2, smoothstep(0.0, 0.1, mixVal));
            finalColor = mix(finalColor, color3, smoothstep(0.1, 0.3, mixVal));
            finalColor = mix(finalColor, color4, smoothstep(0.3, 0.4, mixVal));
            finalColor = mix(finalColor, color5, smoothstep(0.4, 0.5, mixVal));

            // --- 2. Fresnel Map ---
            float fresnelTerm = 1.0 - max(dot(viewDir, vNormal), 0.0);
            fresnelTerm = pow(fresnelTerm, 2.0); 
            fresnelTerm = smoothstep(0.4, 0.7, fresnelTerm);
            
            float rimNoise = snoise(scaledPos * 8.0 - (time * 0.1));
            fresnelTerm *= (rimNoise * 0.5 + 0.5);
            // Improve fresnel glow for shinier appearance
            vec3 fresnelGlow = color5 * fresnelTerm * 1.2;

            // --- 3. Twinkle Map ---
            float twinkleMask = smoothstep(0.1, 0.9, snoise(scaledPos * 1.5 - (time * 0.05)));
            float twinkles = step(0.78, snoise(scaledPos * 30.0 + (time * 0.1)));
            float twinkles2 = step(0.82, snoise(scaledPos * 100.0 + (time * 0.15)));
            float starField = max(twinkles, twinkles2 * 0.8);
            // Reduce twinkle brightness so it doesn't wash out the ramp
            vec3 twinkleGlow = vec3(0.0, 1.0, 1.0) * (starField * twinkleMask) * 10.0;

            // --- Composite ---
            vec3 compositeColor = finalColor + fresnelGlow + twinkleGlow;
            // Pass HDR (unclamped) color to the Three.js tonemapper so it can
            // properly compress highlights and preserve contrast. Clamping early
            // prevents tonemapping from working correctly and causes washed-out
            // clipped highlights.
            gl_FragColor = vec4(compositeColor, 1.0);

            // --- THE FIX: Standard Color Profile Transformation ---
            // Let Three.js do tonemapping and colorspace conversion from linear -> sRGB
            #include <tonemapping_fragment>
            #include <colorspace_fragment>

            // Final clamp to normalized display range to avoid NaNs/overflow on some GPUs
            gl_FragColor = clamp(gl_FragColor, 0.0, 1.0);
        }
    `,
    side: THREE.DoubleSide
});