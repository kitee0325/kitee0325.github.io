// Velocity passes reuse the repository's WebGL Fluid Simulation shaders; no dye or postprocessing.
import * as shaders from './shaders';
import { config, clamp } from '../Profile/aquarium/data';
import type { WaterImpulse } from '../Profile/aquarium/physics';
export function waterCoordinates(
  e: WaterImpulse,
  width: number,
  gw: number,
  gh: number
) {
  return {
    u: clamp((e.x - 4) / (width - 8), 0, 1),
    v: 1 - clamp((e.y - 32) / 228, 0, 1),
    vx: (e.vx * gw) / (width - 8),
    vy: (-e.vy * gh) / 228,
  };
}
const header = `precision highp float; varying vec2 vUv; uniform sampler2D uVelocity; uniform vec2 texelSize;`;
const impulseShader =
  header +
  `
uniform vec2 point; uniform vec2 velocity; uniform vec2 waterSize; uniform float radius; uniform float strength;
void main(){vec2 d=(vUv-point)*waterSize; vec2 v=texture2D(uVelocity,vUv).xy+velocity*exp(-dot(d,d)/(radius*radius))*strength; gl_FragColor=vec4(v,0.,1.);}`;
const boundaryShader =
  header +
  `
void main(){vec2 v=texture2D(uVelocity,vUv).xy;
if(vUv.x<texelSize.x||vUv.x>1.-texelSize.x)v.x=0.;
if(vUv.y<texelSize.y||vUv.y>1.-texelSize.y)v.y=0.;
gl_FragColor=vec4(v,0.,1.);}`;
const rgb = (hex: string) =>
  `vec3(${[1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(6)).join(',')})`;
const displayShader =
  header +
  `
uniform vec2 logicalPerCell; uniform float dark;
void main(){float s=length(texture2D(uVelocity,vUv).xy*logicalPerCell)/${config.referenceSpeed.toFixed(1)};
vec3 c=${rgb(config.waterColors[0])};
${config.thresholds.map((t, i) => `if(s>=${t.toFixed(2)})c=${rgb(config.waterColors[i + 1])};`).join('\n')}
c=mix(c,c*vec3(.17,.25,.38),dark);gl_FragColor=vec4(c,1.);}`;
interface Target {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
}
export function createFluid(width: number, shortSide = 96) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) throw Error('WebGL2 unavailable');
  const gw = Math.round((shortSide * (width - 8)) / 228),
    gh = shortSide;
  canvas.width = gw;
  canvas.height = gh;
  const textures: WebGLTexture[] = [],
    fbos: WebGLFramebuffer[] = [],
    programs: WebGLProgram[] = [],
    compiled: WebGLShader[] = [],
    buffers: WebGLBuffer[] = [];
  let lost = false,
    disposed = false;
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };
  canvas.addEventListener('webglcontextlost', onLost);
  function dispose() {
    if (disposed) return;
    disposed = true;
    canvas.removeEventListener('webglcontextlost', onLost);
    textures.forEach((t) => gl.deleteTexture(t));
    fbos.forEach((f) => gl.deleteFramebuffer(f));
    programs.forEach((p) => gl.deleteProgram(p));
    compiled.forEach((s) => gl.deleteShader(s));
    buffers.forEach((b) => gl.deleteBuffer(b));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  try {
    if (!gl.getExtension('EXT_color_buffer_float'))
      throw Error('Floating point framebuffer unavailable');
    function compile(source: string, type: number) {
      const s = gl.createShader(type);
      if (!s) throw Error('Cannot create shader');
      compiled.push(s);
      source = source
        .replace(/attribute /g, 'in ')
        .replace(/varying /g, type === gl.VERTEX_SHADER ? 'out ' : 'in ')
        .replace(/texture2D/g, 'texture');
      if (type === gl.FRAGMENT_SHADER)
        source =
          'out highp vec4 fragColor;\n' +
          source.replace(/gl_FragColor/g, 'fragColor');
      gl.shaderSource(s, '#version 300 es\n' + source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(s) || 'Shader compile failed');
      return s;
    }
    const vertex = compile(shaders.baseVertexShader, gl.VERTEX_SHADER);
    function program(source: string) {
      const p = gl.createProgram();
      if (!p) throw Error('Cannot create program');
      programs.push(p);
      gl.attachShader(p, vertex);
      gl.attachShader(p, compile(source, gl.FRAGMENT_SHADER));
      gl.bindAttribLocation(p, 0, 'aPosition');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(p) || 'Shader link failed');
      const uniforms: Record<string, WebGLUniformLocation> = {};
      for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
        const name = gl.getActiveUniform(p, i)!.name;
        uniforms[name] = gl.getUniformLocation(p, name)!;
      }
      return { p, u: uniforms };
    }
    const advect = program(
        '#define MANUAL_FILTERING\n' + shaders.advectionShader
      ),
      diverge = program(shaders.divergenceShader),
      pressurePass = program(shaders.pressureShader),
      gradient = program(shaders.gradientSubtractShader),
      inject = program(impulseShader),
      boundary = program(boundaryShader),
      display = program(displayShader);
    function target(): Target {
      const texture = gl.createTexture()!,
        fbo = gl.createFramebuffer()!;
      textures.push(texture);
      fbos.push(fbo);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D, p, gl.NEAREST);
      for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        gw,
        gh,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        throw Error('Incomplete velocity framebuffer');
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return { texture, fbo };
    }
    let velocity = [target(), target()],
      pressure = [target(), target()];
    const divergence = target();
    const buffer = gl.createBuffer()!;
    buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    function use(p: ReturnType<typeof program>) {
      gl.useProgram(p.p);
      gl.uniform2f(p.u.texelSize, 1 / gw, 1 / gh);
      return p.u;
    }
    function texture(t: Target, unit: number, uniform: WebGLUniformLocation) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t.texture);
      gl.uniform1i(uniform, unit);
    }
    function draw(t: Target | null) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t?.fbo ?? null);
      gl.viewport(0, 0, gw, gh);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function reset() {
      if (disposed || lost || gl.isContextLost()) return;
      for (const fbo of fbos) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }
    return {
      canvas,
      gw,
      gh,
      dispose,
      reset,
      get lost() {
        return lost || gl.isContextLost();
      },
      step(dt: number, events: WaterImpulse[]) {
        if (disposed || lost) return;
        let u = use(advect);
        texture(velocity[0], 0, u.uVelocity);
        texture(velocity[0], 0, u.uSource);
        gl.uniform2f(u.dyeTexelSize, 1 / gw, 1 / gh);
        gl.uniform1f(u.dt, dt);
        gl.uniform1f(u.dissipation, 0.8);
        draw(velocity[1]);
        velocity.reverse();
        for (const e of events) {
          const c = waterCoordinates(e, width, gw, gh);
          u = use(inject);
          texture(velocity[0], 0, u.uVelocity);
          gl.uniform2f(u.point, c.u, c.v);
          gl.uniform2f(u.velocity, c.vx, c.vy);
          gl.uniform2f(u.waterSize, width - 8, 228);
          gl.uniform1f(u.radius, e.radius);
          gl.uniform1f(u.strength, e.strength);
          draw(velocity[1]);
          velocity.reverse();
        }
        u = use(boundary);
        texture(velocity[0], 0, u.uVelocity);
        draw(velocity[1]);
        velocity.reverse();
        u = use(diverge);
        texture(velocity[0], 0, u.uVelocity);
        draw(divergence);
        for (const p of pressure) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, p.fbo);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
        u = use(pressurePass);
        texture(divergence, 0, u.uDivergence);
        for (let i = 0; i < (shortSide === 96 ? 12 : 8); i++) {
          texture(pressure[0], 1, u.uPressure);
          draw(pressure[1]);
          pressure.reverse();
        }
        u = use(gradient);
        texture(pressure[0], 0, u.uPressure);
        texture(velocity[0], 1, u.uVelocity);
        draw(velocity[1]);
        velocity.reverse();
        u = use(boundary);
        texture(velocity[0], 0, u.uVelocity);
        draw(velocity[1]);
        velocity.reverse();
      },
      render(dark = false) {
        if (disposed || lost) return;
        const u = use(display);
        texture(velocity[0], 0, u.uVelocity);
        gl.uniform2f(u.logicalPerCell, (width - 8) / gw, 228 / gh);
        gl.uniform1f(u.dark, dark ? 1 : 0);
        draw(null);
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
export type Fluid = ReturnType<typeof createFluid>;
