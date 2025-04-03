import { compileShader, createProgram, getUniforms } from './utils';
import * as shaders from './shaders';

export class Material {
  vertexShader: WebGLShader;
  fragmentShaderSource: string;
  programs: { [key: number]: WebGLProgram } = {};
  activeProgram: WebGLProgram | null = null;
  uniforms: { [key: string]: WebGLUniformLocation } = {};
  gl: WebGLRenderingContext | WebGL2RenderingContext;

  constructor(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    vertexShader: WebGLShader,
    fragmentShaderSource: string
  ) {
    this.gl = gl;
    this.vertexShader = vertexShader;
    this.fragmentShaderSource = fragmentShaderSource;
  }

  setKeywords(keywords: string[] = []) {
    const gl = this.gl;
    let hash = 0;
    for (let i = 0; i < keywords.length; i++) {
      const s = keywords[i];
      for (let j = 0; j < s.length; j++) {
        hash += s.charCodeAt(j);
      }
    }

    let program = this.programs[hash];
    if (!program) {
      const fragmentShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        this.fragmentShaderSource,
        keywords
      );
      if (!fragmentShader) return;
      program = createProgram(gl, this.vertexShader, fragmentShader)!;
      this.programs[hash] = program;
    }

    if (program === this.activeProgram) return;

    this.uniforms = getUniforms(gl, program);
    this.activeProgram = program;
  }

  bind() {
    if (this.activeProgram) {
      this.gl.useProgram(this.activeProgram);
    }
  }
}

export class Program {
  uniforms: { [key: string]: WebGLUniformLocation };
  program: WebGLProgram;
  gl: WebGLRenderingContext | WebGL2RenderingContext;

  constructor(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ) {
    this.gl = gl;
    this.program = createProgram(gl, vertexShader, fragmentShader)!;
    this.uniforms = getUniforms(gl, this.program);
  }

  bind() {
    this.gl.useProgram(this.program);
  }
}

export class FramebufferObject {
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  width: number;
  height: number;
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  texelSizeX: number;
  texelSizeY: number;
  internalFormat: number;
  format: number;
  type: number;
  filter: number;

  constructor(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    type: number,
    filter: number
  ) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this.texture = gl.createTexture()!;
    this.fbo = gl.createFramebuffer()!;
    this.internalFormat = internalFormat;
    this.format = format;
    this.type = type;
    this.filter = filter;
    this.texelSizeX = 1.0 / width;
    this.texelSizeY = 1.0 / height;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      width,
      height,
      0,
      format,
      type,
      null
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture,
      0
    );
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  attach(id: number): number {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + id);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    return id;
  }
}

export class DoubleFBO {
  gl: WebGLRenderingContext | WebGL2RenderingContext;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FramebufferObject;
  write: FramebufferObject;
  internalFormat: number;
  format: number;
  type: number;
  filter: number;

  constructor(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    type: number,
    filter: number
  ) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this.texelSizeX = 1.0 / width;
    this.texelSizeY = 1.0 / height;
    this.internalFormat = internalFormat;
    this.format = format;
    this.type = type;
    this.filter = filter;
    this.read = new FramebufferObject(
      gl,
      width,
      height,
      internalFormat,
      format,
      type,
      filter
    );
    this.write = new FramebufferObject(
      gl,
      width,
      height,
      internalFormat,
      format,
      type,
      filter
    );
  }

  swap() {
    const temp = this.read;
    this.read = this.write;
    this.write = temp;
  }
}
