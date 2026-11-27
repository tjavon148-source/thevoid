/* Black hole: a WebGL1 fragment shader drawn behind the empty "O" of VOID. */
(function(){
  const hero=document.getElementById("hero"),canvas=document.getElementById("hole"),oEl=document.getElementById("o");
  if(!hero||!canvas||!oEl)return;
  const root=document.documentElement;
  const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse=window.matchMedia("(pointer: coarse)").matches||window.innerWidth<700;
  const FS=`precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uC; uniform float uR; uniform float uOpen;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
vec3 starLayer(vec2 px, float cell, float thresh, float seed, float rad){
  vec2 g = px / cell; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
  float h = hash(id + seed);
  if (h < thresh) return vec3(0.0);
  vec2 o = (vec2(hash(id + seed + 1.0), hash(id + seed + 2.0)) - 0.5) * 0.6;
  float d = length(f - o);
  float tw = 0.65 + 0.35 * sin(uTime * (0.8 + h * 3.0) + h * 60.0);
  float s = smoothstep(rad, 0.0, d * cell) * tw;
  vec3 tint = mix(vec3(1.0), vec3(1.0, 0.55, 0.6), hash(id + seed + 3.0));
  return s * tint * (0.5 + 0.9 * hash(id + seed + 4.0));
}
// emission of the disc at disc-radius rd (1.5 .. 3.6) and angle a
vec3 disc(float rd, float a){
  float spin = uTime * 0.55 / pow(rd, 1.2);
  float ang = a + spin;
  vec2 q = vec2(cos(ang), sin(ang)) * 2.4 + vec2(rd * 2.6, rd * 0.7);
  float t = fbm(q) * 0.7 + fbm(q * 2.3 + 9.0) * 0.5;
  float band = smoothstep(1.35, 1.75, rd) * smoothstep(4.6, 2.6, rd);
  float heat = pow(1.65 / rd, 1.9);
  float dop = 1.0 + 0.75 * cos(a - 0.4);
  float e = band * (0.35 + 1.05 * t) * heat * dop;
  vec3 hot = vec3(1.0, 0.82, 0.74), mid = vec3(1.0, 0.18, 0.2), cool = vec3(0.45, 0.0, 0.07);
  vec3 col = mix(cool, mid, smoothstep(0.1, 0.8, e));
  col = mix(col, hot, smoothstep(0.9, 2.0, e));
  return col * e * 2.1;
}
void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - uC) / uR;
  float r = length(p);
  // gravitational lensing of the world behind the hole
  vec2 src = p - p / max(r * r, 0.0001) * 0.9 * uOpen;
  vec2 wpx = uC + src * uR;
  vec2 uv = frag / uRes;
  vec3 col = vec3(0.012, 0.012, 0.013);
  // red nebula on the left, thin one on the right
  float neb = fbm(wpx / 520.0 + vec2(0.0, uTime * 0.01));
  float left = smoothstep(0.75, 0.0, uv.x);
  col += vec3(0.16, 0.16, 0.2) * left * (0.28 + 0.55 * neb) * 0.04 * (0.55 + 0.45 * smoothstep(1.0, 0.2, abs(uv.y - 0.45) * 1.6));
  col += vec3(0.12, 0.12, 0.16) * smoothstep(0.55, 1.0, uv.x) * neb * 0.04;
  // stars (lensed)
  col += starLayer(wpx, 38.0, 0.90, 1.0, 1.7) * 0.9;
  col += starLayer(wpx + 400.0, 90.0, 0.90, 7.0, 2.6) * 1.3;
  // far side of the disc, bent over and under the hole by gravity
  if (r > 1.0) {
    float a2 = atan(p.y, p.x);
    float t = r - 1.0;
    float ring = exp(-t * 2.6) * smoothstep(0.0, 0.05, t);
    float topw = 0.35 + 0.65 * pow(max(sin(a2), 0.0), 0.7);
    float botw = 0.14 * pow(max(-sin(a2), 0.0), 0.8);
    col += disc(1.55 + t * 2.4, a2) * ring * (topw + botw) * 0.9 * uOpen;
  }
  // the flat disc, tilted: lower half crosses in front of the hole
  vec2 d = vec2(p.x, p.y * 3.1);
  float rd = length(d);
  float ad = atan(d.y, d.x);
  bool front = p.y < 0.0;
  if (rd > 1.35 && (front || r > 1.0)) {
    col += disc(rd, ad) * uOpen * 1.0;
  }
  // photon ring and halo
  float pr = exp(-pow((r - 1.035) * 22.0, 2.0)) * 1.6;
  float halo = exp(-max(r - 1.0, 0.0) * 3.2) * 0.35;
  col += (vec3(1.0, 0.78, 0.72) * pr + vec3(1.0, 0.14, 0.18) * halo) * uOpen;
  // event horizon: pure black, but the front disc is painted over it again
  {
    vec3 hole = vec3(0.0);
    if (front && rd > 1.35) hole += disc(rd, ad) * uOpen * 1.15;
    float aa = 1.6 / uR;
    col = mix(hole, col, smoothstep(1.0 - aa, 1.0, r));
  }
  // vignette and soft tone map
  float vg = smoothstep(1.35, 0.35, length((uv - vec2(0.5, 0.48)) * vec2(1.0, 1.15)));
  col *= 0.55 + 0.45 * vg;
  col = 1.0 - exp(-col * 1.35);
  col = pow(col, vec3(0.95));
  gl_FragColor = vec4(col, 1.0);
}
`;
  let gl=null,prog=null,U={},run=false,visible=true,t0=performance.now(),openAt=null,W=0,H=0,dpr=1,cx=0,cy=0,R=100;
  function initGL(){
    try{gl=canvas.getContext("webgl",{antialias:false,alpha:false,powerPreference:"high-performance"})||canvas.getContext("experimental-webgl")}catch(e){gl=null}
    if(!gl)return false;
    // Software-rendered WebGL (no GPU) would freeze the page, so use the drawn-ring fallback there.
    try{const x=gl.getExtension("WEBGL_debug_renderer_info");if(x&&/swiftshader|llvmpipe|software/i.test(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)))return false}catch(e){}
    const sh=(type,s)=>{const o=gl.createShader(type);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(o));return null}return o};
    const vs=sh(gl.VERTEX_SHADER,"attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }");
    const fs=sh(gl.FRAGMENT_SHADER,FS);
    if(!vs||!fs)return false;
    prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS))return false;
    gl.useProgram(prog);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(prog,"a");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    ["uRes","uTime","uC","uR","uOpen"].forEach(n=>U[n]=gl.getUniformLocation(prog,n));
    return true;
  }
  function layout(){
    if(!gl)return;
    const hr=hero.getBoundingClientRect(),orc=oEl.getBoundingClientRect();
    dpr=Math.min(window.devicePixelRatio||1,coarse?1.25:1.5);
    W=Math.max(2,Math.round(hr.width*dpr));H=Math.max(2,Math.round(hr.height*dpr));
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
    gl.viewport(0,0,W,H);
    cx=(orc.left-hr.left+orc.width/2)*dpr;
    cy=(hr.height-(orc.top-hr.top+orc.height/2))*dpr;
    R=orc.width*0.36*dpr;
    draw(performance.now());
  }
  function draw(now){
    if(!gl)return;
    const t=(now-t0)/1000;let open=1;
    if(!reduce){if(openAt===null)openAt=now;const k=Math.min(1,(now-openAt)/2600);open=1-Math.pow(1-k,3)}
    gl.uniform2f(U.uRes,W,H);gl.uniform1f(U.uTime,reduce?3.0:t);gl.uniform2f(U.uC,cx,cy);gl.uniform1f(U.uR,R);gl.uniform1f(U.uOpen,open);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }
  function loop(now){if(!run)return;draw(now);requestAnimationFrame(loop)}
  function setRun(on){if(reduce||!gl)return;if(on&&!run){run=true;requestAnimationFrame(loop)}else if(!on)run=false}
  if(initGL()){
    layout();
    if("ResizeObserver" in window)new ResizeObserver(layout).observe(hero);else window.addEventListener("resize",layout);
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(layout);
    window.addEventListener("load",layout);
    if("IntersectionObserver" in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting;setRun(visible&&!document.hidden)}).observe(hero);
    document.addEventListener("visibilitychange",()=>setRun(visible&&!document.hidden));
    canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();root.classList.add("nogl");run=false});
    setRun(true);
  }else{root.classList.add("nogl")}
})();
