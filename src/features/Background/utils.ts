// WebGL工具函数

export function compileShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string,
  keywords?: string[]
) {
  const shader = gl.createShader(type)!;
  let shaderSource = source;

  if (keywords) {
    let keywordsString = '';
    keywords.forEach((keyword) => {
      keywordsString += '#define ' + keyword + '\n';
    });
    shaderSource = keywordsString + shaderSource;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Could not compile shader: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function createProgram(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  const program = gl.createProgram()!;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Could not link program: ' + gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export function getUniforms(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  program: WebGLProgram
) {
  const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  const uniformMap: { [key: string]: WebGLUniformLocation } = {};

  for (let i = 0; i < uniformCount; i++) {
    const uniformInfo = gl.getActiveUniform(program, i);
    if (uniformInfo) {
      const uniformName = uniformInfo.name;
      const uniformLocation = gl.getUniformLocation(program, uniformName);
      if (uniformLocation) {
        uniformMap[uniformName] = uniformLocation;
      }
    }
  }

  return uniformMap;
}

export function getResolution(resolution: number) {
  let aspectRatio = window.innerWidth / window.innerHeight;
  if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

  let min = Math.round(resolution);
  let max = Math.round(resolution * aspectRatio);

  if (window.innerWidth > window.innerHeight)
    return { width: max, height: min };
  else return { width: min, height: max };
}

export function hashCode(s: string): number {
  if (s.length === 0) return 0;

  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return hash;
}
