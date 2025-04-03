import React, { useEffect, useRef } from 'react';
import { compileShader, createProgram, getResolution } from './utils';
import * as shaders from './shaders';
import { Material, Program, FramebufferObject, DoubleFBO } from './fluid';

interface BackgroundProps {
  debug?: boolean;
}

const Background: React.FC<BackgroundProps> = ({ debug = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // 检测深色/浅色模式 - 适配Docusaurus
    const detectTheme = () => {
      // Docusaurus使用data-theme属性来表示当前主题
      const htmlElement = document.documentElement;
      const isDarkTheme =
        htmlElement.getAttribute('data-theme') === 'dark' ||
        document.body.classList.contains('dark-theme');

      // 如果无法通过Docusaurus特定方式检测，则回退到系统偏好
      return isDarkTheme !== null
        ? isDarkTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    const prefersDarkMode = detectTheme();

    // 根据模式设置默认配置（参照官方Demo参数）
    let config = {
      SIM_RESOLUTION: 128, // 官方默认值：128
      DYE_RESOLUTION: 1024,
      CAPTURE_RESOLUTION: 512,
      DENSITY_DISSIPATION: 1.0, // 官方默认值：接近1.0
      VELOCITY_DISSIPATION: 0.2, // 官方默认值：0.2
      PRESSURE: 0.8, // 官方默认值：0.8
      PRESSURE_ITERATIONS: 20,
      CURL: 30, // 官方默认值：30 (vorticity)
      SPLAT_RADIUS: 0.25, // 官方默认值：0.25
      SPLAT_FORCE: 6000,
      SHADING: true, // 官方默认值：启用
      COLORFUL: true, // 官方默认值：启用
      COLOR_UPDATE_SPEED: 10,
      PAUSED: false, // 官方默认值：禁用
      BACK_COLOR: prefersDarkMode
        ? { r: 15, g: 15, b: 15 }
        : { r: 240, g: 240, b: 240 },
      TRANSPARENT: false,
      BLOOM: true, // 官方默认值：启用
      BLOOM_ITERATIONS: 8,
      BLOOM_RESOLUTION: 256,
      BLOOM_INTENSITY: 0.8,
      BLOOM_THRESHOLD: 0.6,
      BLOOM_SOFT_KNEE: 0.7,
      SUNRAYS: true, // 官方默认值：启用
      SUNRAYS_RESOLUTION: 196,
      SUNRAYS_WEIGHT: 1.0,
    };

    // Pointer prototype
    class Pointer {
      id: number;
      texcoordX: number;
      texcoordY: number;
      prevTexcoordX: number;
      prevTexcoordY: number;
      deltaX: number;
      deltaY: number;
      down: boolean;
      moved: boolean;
      color: number[];

      constructor() {
        this.id = -1;
        this.texcoordX = 0;
        this.texcoordY = 0;
        this.prevTexcoordX = 0;
        this.prevTexcoordY = 0;
        this.deltaX = 0;
        this.deltaY = 0;
        this.down = false;
        this.moved = false;
        this.color = [30, 0, 300];
      }
    }

    let pointers: Pointer[] = [];
    let splatStack: number[] = [];
    pointers.push(new Pointer());

    // WebGL上下文获取 - 修复类型问题
    const getWebGLContext = (canvas: HTMLCanvasElement) => {
      const params = {
        alpha: true,
        depth: false,
        stencil: false,
        antialias: false,
        preserveDrawingBuffer: false,
      };

      // 尝试获取WebGL2上下文
      const gl2 = canvas.getContext(
        'webgl2',
        params
      ) as WebGL2RenderingContext | null;
      if (gl2) {
        // 使用WebGL2
        const halfFloatTexType = gl2.HALF_FLOAT;
        gl2.getExtension('EXT_color_buffer_float');
        const supportLinearFiltering = gl2.getExtension(
          'OES_texture_float_linear'
        );

        gl2.clearColor(0.0, 0.0, 0.0, 1.0);

        // 获取WebGL2特有的格式
        const formatRGBA = getSupportedFormat(
          gl2,
          gl2.RGBA16F,
          gl2.RGBA,
          halfFloatTexType
        );
        const formatRG = getSupportedFormat(
          gl2,
          gl2.RG16F,
          gl2.RG,
          halfFloatTexType
        );
        const formatR = getSupportedFormat(
          gl2,
          gl2.R16F,
          gl2.RED,
          halfFloatTexType
        );

        return {
          gl: gl2,
          isWebGL2: true,
          ext: {
            formatRGBA,
            formatRG,
            formatR,
            halfFloatTexType,
            supportLinearFiltering,
          },
        };
      } else {
        // 回退到WebGL1
        const gl1 = (canvas.getContext('webgl', params) ||
          canvas.getContext(
            'experimental-webgl',
            params
          )) as WebGLRenderingContext | null;

        if (!gl1) {
          return {
            gl: null,
            isWebGL2: false,
            ext: { supportLinearFiltering: false },
          };
        }

        const halfFloat = gl1.getExtension('OES_texture_half_float');
        const supportLinearFiltering = gl1.getExtension(
          'OES_texture_half_float_linear'
        );

        gl1.clearColor(0.0, 0.0, 0.0, 1.0);

        const halfFloatTexType = halfFloat?.HALF_FLOAT_OES;
        const formatRGBA = getSupportedFormat(
          gl1,
          gl1.RGBA,
          gl1.RGBA,
          halfFloatTexType
        );
        const formatRG = getSupportedFormat(
          gl1,
          gl1.RGBA,
          gl1.RGBA,
          halfFloatTexType
        );
        const formatR = getSupportedFormat(
          gl1,
          gl1.RGBA,
          gl1.RGBA,
          halfFloatTexType
        );

        return {
          gl: gl1,
          isWebGL2: false,
          ext: {
            formatRGBA,
            formatRG,
            formatR,
            halfFloatTexType,
            supportLinearFiltering,
          },
        };
      }
    };

    function getSupportedFormat(
      gl: WebGLRenderingContext | WebGL2RenderingContext,
      internalFormat: number,
      format: number,
      type: number | undefined
    ) {
      if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
        // 检查是否为WebGL2
        if ('R16F' in gl) {
          // WebGL2特有的常量
          const gl2 = gl as WebGL2RenderingContext;
          switch (internalFormat) {
            case gl2.R16F:
              return getSupportedFormat(gl2, gl2.RG16F, gl2.RG, type);
            case gl2.RG16F:
              return getSupportedFormat(gl2, gl2.RGBA16F, gl2.RGBA, type);
            default:
              return null;
          }
        }
        return null;
      }

      return {
        internalFormat,
        format,
      };
    }

    function supportRenderTextureFormat(
      gl: WebGLRenderingContext | WebGL2RenderingContext,
      internalFormat: number,
      format: number,
      type: number | undefined
    ) {
      if (!type) return false;

      let texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        internalFormat,
        4,
        4,
        0,
        format,
        type,
        null
      );

      let fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );

      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      return status === gl.FRAMEBUFFER_COMPLETE;
    }

    const webglContext = getWebGLContext(canvas);
    const gl = webglContext.gl;
    const isWebGL2 = webglContext.isWebGL2;
    const ext = webglContext.ext;

    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    if (isMobile()) {
      config.DYE_RESOLUTION = 512;
    }
    if (!ext.supportLinearFiltering) {
      config.DYE_RESOLUTION = 512;
      config.SHADING = false;
      config.BLOOM = false;
      config.SUNRAYS = false;
    }

    // 流体模拟变量
    let dye: DoubleFBO;
    let velocity: DoubleFBO;
    let divergence: FramebufferObject;
    let curl: FramebufferObject;
    let pressure: DoubleFBO;
    let bloom: FramebufferObject;
    let bloomFramebuffers: FramebufferObject[] = [];
    let sunrays: FramebufferObject;
    let sunraysTemp: FramebufferObject;

    // 着色器程序
    let ditheringTexture: WebGLTexture;

    let blurProgram: Program;
    let copyProgram: Program;
    let clearProgram: Program;
    let colorProgram: Program;
    let checkerboardProgram: Program;
    let bloomPrefilterProgram: Program;
    let bloomBlurProgram: Program;
    let bloomFinalProgram: Program;
    let sunraysProgram: Program;
    let sunraysMaskProgram: Program;
    let splatProgram: Program;
    let advectionProgram: Program;
    let divergenceProgram: Program;
    let curlProgram: Program;
    let vorticityProgram: Program;
    let pressureProgram: Program;
    let gradienSubtractProgram: Program;

    let displayMaterial: Material;

    // 初始化着色器
    function initShaders() {
      const baseVertexShader = compileShader(
        gl,
        gl.VERTEX_SHADER,
        shaders.baseVertexShader
      )!;
      const blurVertexShader = compileShader(
        gl,
        gl.VERTEX_SHADER,
        shaders.blurVertexShader
      )!;
      const blurShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.blurShader
      )!;
      const copyShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.copyShader
      )!;
      const clearShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.clearShader
      )!;
      const colorShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.colorShader
      )!;
      const checkerboardShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.checkerboardShader
      )!;
      const bloomPrefilterShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.bloomPrefilterShader
      )!;
      const bloomBlurShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.bloomBlurShader
      )!;
      const bloomFinalShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.bloomFinalShader
      )!;
      const sunraysShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.sunraysShader
      )!;
      const sunraysMaskShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.sunraysMaskShader
      )!;
      const splatShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.splatShader
      )!;
      const advectionShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.advectionShader
      )!;
      const divergenceShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.divergenceShader
      )!;
      const curlShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.curlShader
      )!;
      const vorticityShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.vorticityShader
      )!;
      const pressureShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.pressureShader
      )!;
      const gradientSubtractShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        shaders.gradientSubtractShader
      )!;

      blurProgram = new Program(gl, blurVertexShader, blurShader);
      copyProgram = new Program(gl, baseVertexShader, copyShader);
      clearProgram = new Program(gl, baseVertexShader, clearShader);
      colorProgram = new Program(gl, baseVertexShader, colorShader);
      checkerboardProgram = new Program(
        gl,
        baseVertexShader,
        checkerboardShader
      );
      bloomPrefilterProgram = new Program(
        gl,
        baseVertexShader,
        bloomPrefilterShader
      );
      bloomBlurProgram = new Program(gl, baseVertexShader, bloomBlurShader);
      bloomFinalProgram = new Program(gl, baseVertexShader, bloomFinalShader);
      sunraysProgram = new Program(gl, baseVertexShader, sunraysShader);
      sunraysMaskProgram = new Program(gl, baseVertexShader, sunraysMaskShader);
      splatProgram = new Program(gl, baseVertexShader, splatShader);
      advectionProgram = new Program(gl, baseVertexShader, advectionShader);
      divergenceProgram = new Program(gl, baseVertexShader, divergenceShader);
      curlProgram = new Program(gl, baseVertexShader, curlShader);
      vorticityProgram = new Program(gl, baseVertexShader, vorticityShader);
      pressureProgram = new Program(gl, baseVertexShader, pressureShader);
      gradienSubtractProgram = new Program(
        gl,
        baseVertexShader,
        gradientSubtractShader
      );

      displayMaterial = new Material(
        gl,
        baseVertexShader,
        shaders.displayShaderSource
      );
    }

    function initFramebuffers() {
      let simRes = getResolution(config.SIM_RESOLUTION);
      let dyeRes = getResolution(config.DYE_RESOLUTION);

      const texType = ext.halfFloatTexType;
      const rgba = ext.formatRGBA;
      const rg = ext.formatRG;
      const r = ext.formatR;
      const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

      if (!rgba || !texType) {
        console.error('初始化帧缓冲区失败: 格式不支持');
        return;
      }

      gl.disable(gl.BLEND);

      if (dye) dye.read.attach(0);

      // 颜色
      dye = new DoubleFBO(
        gl,
        dyeRes.width,
        dyeRes.height,
        rgba.internalFormat,
        rgba.format,
        texType,
        filtering
      );

      // 速度
      velocity = new DoubleFBO(
        gl,
        simRes.width,
        simRes.height,
        rg?.internalFormat || rgba.internalFormat,
        rg?.format || rgba.format,
        texType,
        filtering
      );

      // 散度
      divergence = new FramebufferObject(
        gl,
        simRes.width,
        simRes.height,
        r?.internalFormat || rgba.internalFormat,
        r?.format || rgba.format,
        texType,
        gl.NEAREST
      );

      // 旋度
      curl = new FramebufferObject(
        gl,
        simRes.width,
        simRes.height,
        r?.internalFormat || rgba.internalFormat,
        r?.format || rgba.format,
        texType,
        gl.NEAREST
      );

      // 压力
      pressure = new DoubleFBO(
        gl,
        simRes.width,
        simRes.height,
        r?.internalFormat || rgba.internalFormat,
        r?.format || rgba.format,
        texType,
        gl.NEAREST
      );

      initBloomFramebuffers();
      initSunraysFramebuffers();
    }

    function initBloomFramebuffers() {
      let res = getResolution(config.BLOOM_RESOLUTION);

      const texType = ext.halfFloatTexType;
      const rgba = ext.formatRGBA;

      if (!rgba || !texType) return;

      bloom = new FramebufferObject(
        gl,
        res.width,
        res.height,
        rgba.internalFormat,
        rgba.format,
        texType,
        gl.LINEAR
      );

      bloomFramebuffers.length = 0;
      for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
        let width = res.width >> (i + 1);
        let height = res.height >> (i + 1);

        if (width < 2 || height < 2) break;

        let fbo = new FramebufferObject(
          gl,
          width,
          height,
          rgba.internalFormat,
          rgba.format,
          texType,
          gl.LINEAR
        );
        bloomFramebuffers.push(fbo);
      }
    }

    function initSunraysFramebuffers() {
      let res = getResolution(config.SUNRAYS_RESOLUTION);

      const texType = ext.halfFloatTexType;
      const r = ext.formatR;
      const rgba = ext.formatRGBA;

      if (!r || !rgba || !texType) return;

      sunrays = new FramebufferObject(
        gl,
        res.width,
        res.height,
        r.internalFormat,
        r.format,
        texType,
        gl.LINEAR
      );
      sunraysTemp = new FramebufferObject(
        gl,
        res.width,
        res.height,
        r.internalFormat,
        r.format,
        texType,
        gl.LINEAR
      );
    }

    // 创建一个2x2的顶点缓冲区，这是渲染流体的基本几何形状
    function createQuad() {
      const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);
    }

    function updateKeywords() {
      let displayKeywords: string[] = [];
      if (config.SHADING) displayKeywords.push('SHADING');
      if (config.BLOOM) displayKeywords.push('BLOOM');
      if (config.SUNRAYS) displayKeywords.push('SUNRAYS');
      displayMaterial.setKeywords(displayKeywords);
    }

    function initDitheringTexture() {
      const texture = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255])
      );
      ditheringTexture = texture;

      // 创建一个实际的噪声纹理
      const blueNoiseImage = new Image();
      blueNoiseImage.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, ditheringTexture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          blueNoiseImage
        );
      };
      blueNoiseImage.src = 'LDR_LLL1_0.png'; // 应该放在public目录下，或者使用内联base64
    }

    // 核心流体计算和渲染相关函数
    function blit(target?: FramebufferObject) {
      if (target) {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function splat(
      x: number,
      y: number,
      dx: number,
      dy: number,
      color: number[]
    ) {
      splatProgram.bind();
      gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
      gl.uniform1f(
        splatProgram.uniforms.aspectRatio,
        canvas.width / canvas.height
      );
      gl.uniform2f(splatProgram.uniforms.point, x, y);
      gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
      gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100.0);
      blit(velocity.write);
      velocity.swap();

      gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
      gl.uniform3f(splatProgram.uniforms.color, color[0], color[1], color[2]);
      blit(dye.write);
      dye.swap();
    }

    function multipleSplats(amount: number) {
      for (let i = 0; i < amount; i++) {
        const color = generateColor();
        // 根据官方Demo效果调整颜色乘数
        color[0] *= 10.0; // 恢复到官方默认的乘数值
        color[1] *= 10.0;
        color[2] *= 10.0;
        const x = Math.random();
        const y = Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, color);
      }
    }

    function resizeCanvas() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
      }
      return false;
    }

    // 流体模拟算法相关函数
    function applyBloom(
      source: FramebufferObject,
      destination: FramebufferObject
    ) {
      if (bloomFramebuffers.length < 2) return;

      let last = destination;

      gl.disable(gl.BLEND);
      bloomPrefilterProgram.bind();
      let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
      let curve0 = config.BLOOM_THRESHOLD - knee;
      let curve1 = knee * 2;
      let curve2 = 0.25 / knee;
      gl.uniform3f(
        bloomPrefilterProgram.uniforms.curve,
        curve0,
        curve1,
        curve2
      );
      gl.uniform1f(
        bloomPrefilterProgram.uniforms.threshold,
        config.BLOOM_THRESHOLD
      );
      gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0));
      blit(last);

      bloomBlurProgram.bind();
      for (let i = 0; i < bloomFramebuffers.length; i++) {
        let dest = bloomFramebuffers[i];
        gl.uniform2f(
          bloomBlurProgram.uniforms.texelSize,
          last.texelSizeX,
          last.texelSizeY
        );
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        blit(dest);
        last = dest;
      }

      gl.blendFunc(gl.ONE, gl.ONE);
      gl.enable(gl.BLEND);

      for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
        let baseTex = bloomFramebuffers[i];
        gl.uniform2f(
          bloomBlurProgram.uniforms.texelSize,
          last.texelSizeX,
          last.texelSizeY
        );
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        gl.viewport(0, 0, baseTex.width, baseTex.height);
        blit(baseTex);
        last = baseTex;
      }

      gl.disable(gl.BLEND);
      bloomFinalProgram.bind();
      gl.uniform2f(
        bloomFinalProgram.uniforms.texelSize,
        last.texelSizeX,
        last.texelSizeY
      );
      gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0));
      gl.uniform1f(
        bloomFinalProgram.uniforms.intensity,
        config.BLOOM_INTENSITY
      );
      blit(destination);
    }

    function applySunrays(
      source: FramebufferObject,
      mask: FramebufferObject,
      destination: FramebufferObject
    ) {
      gl.disable(gl.BLEND);
      sunraysMaskProgram.bind();
      gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, source.attach(0));
      blit(mask);

      sunraysProgram.bind();
      gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT);
      gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0));
      blit(destination);
    }

    function blur(
      target: FramebufferObject,
      temp: FramebufferObject,
      iterations: number
    ) {
      blurProgram.bind();
      for (let i = 0; i < iterations; i++) {
        gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0);
        gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0));
        blit(temp);

        gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY);
        gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0));
        blit(target);
      }
    }

    function splatPointer(pointer: Pointer) {
      let dx = pointer.deltaX * config.SPLAT_FORCE;
      let dy = pointer.deltaY * config.SPLAT_FORCE;
      splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
    }

    // 颜色相关函数
    function normalizeColor(input: { r: number; g: number; b: number }) {
      return {
        r: input.r / 255,
        g: input.g / 255,
        b: input.b / 255,
      };
    }

    function wrap(value: number, min: number, max: number) {
      const range = max - min;
      if (range === 0) return min;
      return ((value - min) % range) + min;
    }

    function getTextureScale(
      texture: WebGLTexture | null,
      width: number,
      height: number
    ) {
      // 对于WebGLTexture，我们无法直接获取宽高，使用默认值
      return {
        x: width / canvas.width,
        y: height / canvas.height,
      };
    }

    function generateColor() {
      const c = HSVtoRGB(Math.random(), 1.0, 1.0);

      // 根据官方Demo调整颜色强度
      c.r *= 0.15;
      c.g *= 0.15;
      c.b *= 0.15;

      return [c.r, c.g, c.b];
    }

    function HSVtoRGB(h: number, s: number, v: number) {
      let r = 0,
        g = 0,
        b = 0;
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);

      switch (i % 6) {
        case 0:
          r = v;
          g = t;
          b = p;
          break;
        case 1:
          r = q;
          g = v;
          b = p;
          break;
        case 2:
          r = p;
          g = v;
          b = t;
          break;
        case 3:
          r = p;
          g = q;
          b = v;
          break;
        case 4:
          r = t;
          g = p;
          b = v;
          break;
        case 5:
          r = v;
          g = p;
          b = q;
          break;
      }

      return {
        r,
        g,
        b,
      };
    }

    // Mouse Handling
    function scaleByPixelRatio(input: number) {
      const pixelRatio = window.devicePixelRatio || 1;
      return Math.floor(input * pixelRatio);
    }

    function updatePointerDownData(
      pointer: Pointer,
      id: number,
      posX: number,
      posY: number
    ) {
      pointer.id = id;
      pointer.down = true;
      pointer.moved = false;
      pointer.texcoordX = posX / canvas.width;
      pointer.texcoordY = 1.0 - posY / canvas.height;
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.deltaX = 0;
      pointer.deltaY = 0;
      pointer.color = generateColor();
    }

    function updatePointerMoveData(
      pointer: Pointer,
      posX: number,
      posY: number
    ) {
      pointer.prevTexcoordX = pointer.texcoordX;
      pointer.prevTexcoordY = pointer.texcoordY;
      pointer.texcoordX = posX / canvas.width;
      pointer.texcoordY = 1.0 - posY / canvas.height;
      pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
      pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
      pointer.moved =
        Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    }

    function updatePointerUpData(pointer: Pointer) {
      pointer.down = false;
    }

    function correctDeltaX(delta: number) {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio < 1) delta *= aspectRatio;
      return delta;
    }

    function correctDeltaY(delta: number) {
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio > 1) delta /= aspectRatio;
      return delta;
    }

    // 渲染相关函数
    function drawColor(
      target: FramebufferObject | null,
      color: { r: number; g: number; b: number }
    ) {
      colorProgram.bind();
      gl.uniform4f(colorProgram.uniforms.color, color.r, color.g, color.b, 1);
      blit(target);
    }

    function drawCheckerboard(target: FramebufferObject | null) {
      checkerboardProgram.bind();
      gl.uniform1f(
        checkerboardProgram.uniforms.aspectRatio,
        canvas.width / canvas.height
      );
      blit(target);
    }

    function drawDisplay(target: FramebufferObject | null) {
      let width = target ? target.width : gl.drawingBufferWidth;
      let height = target ? target.height : gl.drawingBufferHeight;

      displayMaterial.bind();
      if (config.SHADING)
        gl.uniform2f(
          displayMaterial.uniforms.texelSize,
          1.0 / width,
          1.0 / height
        );
      gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));

      if (config.BLOOM) {
        gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
        if (ditheringTexture) {
          gl.activeTexture(gl.TEXTURE2);
          gl.bindTexture(gl.TEXTURE_2D, ditheringTexture);
          gl.uniform1i(displayMaterial.uniforms.uDithering, 2);
        } else {
          gl.uniform1i(displayMaterial.uniforms.uDithering, 0);
        }
        const scale = getTextureScale(ditheringTexture, width, height);
        gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y);
      }

      if (config.SUNRAYS)
        gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays.attach(3));

      blit(target);
    }

    function render(target: FramebufferObject | null = null) {
      if (config.BLOOM) applyBloom(dye.read, bloom);

      if (config.SUNRAYS) {
        applySunrays(dye.read, dye.write, sunrays);
        blur(sunrays, sunraysTemp, 1);
      }

      if (target == null || !config.TRANSPARENT) {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
      } else {
        gl.disable(gl.BLEND);
      }

      if (!config.TRANSPARENT)
        drawColor(target, normalizeColor(config.BACK_COLOR));

      if (target == null && config.TRANSPARENT) drawCheckerboard(target);

      drawDisplay(target);
    }

    // 主要流体动力学计算函数
    function step(dt: number) {
      gl.disable(gl.BLEND);

      curlProgram.bind();
      gl.uniform2f(
        curlProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY
      );
      gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
      blit(curl);

      vorticityProgram.bind();
      gl.uniform2f(
        vorticityProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY
      );
      gl.uniform1i(
        vorticityProgram.uniforms.uVelocity,
        velocity.read.attach(0)
      );
      gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
      gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
      gl.uniform1f(vorticityProgram.uniforms.dt, dt);
      blit(velocity.write);
      velocity.swap();

      divergenceProgram.bind();
      gl.uniform2f(
        divergenceProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY
      );
      gl.uniform1i(
        divergenceProgram.uniforms.uVelocity,
        velocity.read.attach(0)
      );
      blit(divergence);

      clearProgram.bind();
      gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
      gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
      blit(pressure.write);
      pressure.swap();

      pressureProgram.bind();
      gl.uniform2f(
        pressureProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY
      );
      gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));

      for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(
          pressureProgram.uniforms.uPressure,
          pressure.read.attach(1)
        );
        blit(pressure.write);
        pressure.swap();
      }

      gradienSubtractProgram.bind();
      gl.uniform2f(
        gradienSubtractProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY
      );
      gl.uniform1i(
        gradienSubtractProgram.uniforms.uPressure,
        pressure.read.attach(0)
      );
      gl.uniform1i(
        gradienSubtractProgram.uniforms.uVelocity,
        velocity.read.attach(1)
      );
      blit(velocity.write);
      velocity.swap();

      advectionProgram.bind();
      gl.uniform2f(
        advectionProgram.uniforms.texelSize,
        velocity.texelSizeX,
        velocity.texelSizeY
      );

      if (!ext.supportLinearFiltering)
        gl.uniform2f(
          advectionProgram.uniforms.dyeTexelSize,
          velocity.texelSizeX,
          velocity.texelSizeY
        );

      let velocityId = velocity.read.attach(0);
      gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
      gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
      gl.uniform1f(advectionProgram.uniforms.dt, dt);
      gl.uniform1f(
        advectionProgram.uniforms.dissipation,
        config.VELOCITY_DISSIPATION
      );
      blit(velocity.write);
      velocity.swap();

      if (!ext.supportLinearFiltering)
        gl.uniform2f(
          advectionProgram.uniforms.dyeTexelSize,
          dye.texelSizeX,
          dye.texelSizeY
        );

      gl.uniform1i(
        advectionProgram.uniforms.uVelocity,
        velocity.read.attach(0)
      );
      gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
      gl.uniform1f(
        advectionProgram.uniforms.dissipation,
        config.DENSITY_DISSIPATION
      );
      blit(dye.write);
      dye.swap();
    }

    // 应用交互输入
    function applyInputs() {
      if (splatStack.length > 0) multipleSplats(splatStack.pop() || 0);

      pointers.forEach((p) => {
        if (p.moved) {
          p.moved = false;
          splatPointer(p);
        }
      });
    }

    function updateColors(dt: number) {
      if (!config.COLORFUL) return;

      colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
      if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        pointers.forEach((p) => {
          p.color = generateColor();
        });
      }
    }

    function calcDeltaTime() {
      const now = Date.now();
      let dt = (now - lastUpdateTime) / 1000;
      dt = Math.min(dt, 0.016666);
      lastUpdateTime = now;
      return dt;
    }

    // 主更新循环
    let lastUpdateTime = Date.now();
    let colorUpdateTimer = 0.0;
    let animationFrameId: number;

    // 随机溅射定时器
    let lastSplatTime = Date.now();
    let nextSplatTime = 0;

    function getRandomSplatInterval() {
      // 将溅射间隔延长到2-5秒
      return 2000 + Math.random() * 3000; // 2-5秒的随机间隔
    }

    function update() {
      const dt = calcDeltaTime();
      const now = Date.now();

      if (resizeCanvas()) {
        initFramebuffers();
      }

      updateColors(dt);
      applyInputs();

      // 添加随机溅射逻辑，更接近官方Demo的"Random splats"效果
      if (now > lastSplatTime + nextSplatTime) {
        lastSplatTime = now;
        nextSplatTime = getRandomSplatInterval();
        // 随机创建3-5个溅射
        const splatCount = Math.floor(Math.random() * 3) + 3;
        multipleSplats(splatCount);
      }

      if (!config.PAUSED) step(dt);

      render(null);
      animationFrameId = requestAnimationFrame(update);
    }

    // 初始化全部组件并运行
    function init() {
      // 初始化渲染管道
      initShaders();
      initFramebuffers();
      createQuad();
      initDitheringTexture();
      updateKeywords();

      // 添加事件监听
      canvas.addEventListener('mousedown', (e) => {
        const posX = scaleByPixelRatio(e.offsetX);
        const posY = scaleByPixelRatio(e.offsetY);
        let pointer = pointers[0];
        if (e.button === 0) {
          updatePointerDownData(pointer, -1, posX, posY);
        }
      });

      canvas.addEventListener('mousemove', (e) => {
        const pointer = pointers[0];
        if (!pointer.down) return;
        const posX = scaleByPixelRatio(e.offsetX);
        const posY = scaleByPixelRatio(e.offsetY);
        updatePointerMoveData(pointer, posX, posY);
      });

      window.addEventListener('mouseup', () => {
        updatePointerUpData(pointers[0]);
      });

      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touches = e.targetTouches;
        while (touches.length >= pointers.length) pointers.push(new Pointer());

        for (let i = 0; i < touches.length; i++) {
          const posX = scaleByPixelRatio(touches[i].pageX);
          const posY = scaleByPixelRatio(touches[i].pageY);
          updatePointerDownData(
            pointers[i + 1],
            touches[i].identifier,
            posX,
            posY
          );
        }
      });

      canvas.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
          const touches = e.targetTouches;
          for (let i = 0; i < touches.length; i++) {
            const pointer = pointers[i + 1];
            if (!pointer.down) continue;
            const posX = scaleByPixelRatio(touches[i].pageX);
            const posY = scaleByPixelRatio(touches[i].pageY);
            updatePointerMoveData(pointer, posX, posY);
          }
        },
        false
      );

      window.addEventListener('touchend', (e) => {
        const touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
          const pointer = pointers.find((p) => p.id === touches[i].identifier);
          if (pointer) updatePointerUpData(pointer);
        }
      });

      window.addEventListener('resize', () => {
        resizeCanvas();
        initFramebuffers();
      });

      // 启动动画循环之前先做一些随机溅射
      multipleSplats(3); // 减少初始溅射数量

      // 设置初始随机溅射时间
      nextSplatTime = getRandomSplatInterval();

      // 启动动画
      update();
    }

    function isMobile() {
      return /Mobi|Android/i.test(navigator.userAgent);
    }

    // 初始化
    resizeCanvas();
    init();

    // 监听主题变化
    const handleThemeChange = () => {
      const newDarkMode = detectTheme();
      if (newDarkMode !== prefersDarkMode) {
        // 更新背景颜色
        config.BACK_COLOR = newDarkMode
          ? { r: 15, g: 15, b: 15 }
          : { r: 240, g: 240, b: 240 };

        // 可以选择性地触发一些新的溅射效果
        multipleSplats(3);
      }
    };

    // 添加Docusaurus主题变化监听
    const themeObserver = new MutationObserver(() => {
      handleThemeChange();
    });

    // 监听html元素的data-theme属性变化
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // 监听body类名变化（某些Docusaurus配置可能使用类名）
    themeObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // 组件卸载时清理资源
    return () => {
      cancelAnimationFrame(animationFrameId);

      // 断开主题观察器
      themeObserver.disconnect();

      // 移除事件监听器
      canvas.removeEventListener('mousedown', () => {});
      canvas.removeEventListener('mousemove', () => {});
      window.removeEventListener('mouseup', () => {});
      canvas.removeEventListener('touchstart', () => {});
      canvas.removeEventListener('touchmove', () => {});
      window.removeEventListener('touchend', () => {});
      window.removeEventListener('resize', () => {});
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: debug ? 9999 : -1, // High z-index when debugging, behind content otherwise
        pointerEvents: 'none', // Allow interaction with content behind the canvas
      }}
    />
  );
};

export default Background;
