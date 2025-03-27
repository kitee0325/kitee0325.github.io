import React, { useEffect, useRef } from 'react';
import * as zrender from 'zrender';

interface ShapeMorphProps {
  width: number;
  height: number;
}

// Function to generate random number between min and max
const random = (min: number, max: number) => Math.random() * (max - min) + min;

// Function to generate random HSL color
const randomHSLColor = (prevHue?: number) => {
  // If previous hue is provided, generate a different hue (at least 60 degrees apart)
  let hue = Math.floor(random(0, 360));
  if (prevHue !== undefined) {
    while (Math.abs(hue - prevHue) < 60) {
      hue = Math.floor(random(0, 360));
    }
  }
  const saturation = Math.floor(random(70, 100));
  const lightness = Math.floor(random(50, 70));
  return {
    color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    hue,
  };
};

// 定义形状类型
type ShapeType =
  | 'circle'
  | 'heart'
  | 'star'
  | 'droplet'
  | 'ellipse'
  | 'isogon'
  | 'polygon'
  | 'rect'
  | 'ring'
  | 'rose'
  | 'sector';

// 形状配置接口
interface ShapeConfig {
  type: ShapeType;
  weight: number;
  createShape: (params: ShapeParams) => zrender.Path;
  usesCenterPoint: boolean; // 是否使用 cx,cy 作为中心点
}

interface ShapeParams {
  centerX: number;
  centerY: number;
  maxSize: number;
  style: {
    fill: string;
    stroke: string;
    lineWidth: number;
    strokeNoScale: boolean;
  };
}

// 添加一个辅助函数来获取形状的位置
function getShapePosition(shape: zrender.Path): { x: number; y: number } {
  if (shape.shape.cx !== undefined && shape.shape.cy !== undefined) {
    // 对于使用中心点的形状，返回中心坐标
    return { x: shape.shape.cx, y: shape.shape.cy };
  } else if (shape.shape.x !== undefined && shape.shape.y !== undefined) {
    // 对于使用左上角的形状，直接返回
    return { x: shape.shape.x, y: shape.shape.y };
  }
  // 默认返回原点
  return { x: 0, y: 0 };
}

// 设置形状位置的函数
function setShapePosition(shape: zrender.Path, x: number, y: number): void {
  if (shape.shape.cx !== undefined && shape.shape.cy !== undefined) {
    // 对于使用中心点的形状，设置中心坐标
    shape.attr('shape', { cx: x, cy: y });
  } else if (shape.shape.x !== undefined && shape.shape.y !== undefined) {
    // 对于使用左上角的形状，设置左上角坐标
    shape.attr('shape', { x, y });
  }
}

// 形状配置数组
const SHAPE_CONFIGS: ShapeConfig[] = [
  {
    type: 'circle',
    weight: 1,
    usesCenterPoint: true,
    createShape: ({ centerX, centerY, maxSize, style }) =>
      new zrender.Circle({
        shape: {
          cx: centerX,
          cy: centerY,
          r: maxSize * random(0.3, 0.5),
        },
        style,
      }),
  },
  {
    type: 'heart',
    weight: 1,
    usesCenterPoint: true,
    createShape: ({ centerX, centerY, maxSize, style }) =>
      new zrender.Heart({
        shape: {
          cx: centerX,
          cy: centerY,
          width: maxSize * random(0.4, 0.6),
          height: maxSize * random(0.4, 0.6),
        },
        style,
      }),
  },
  {
    type: 'star',
    weight: 1,
    usesCenterPoint: true,
    createShape: ({ centerX, centerY, maxSize, style }) =>
      new zrender.Star({
        shape: {
          cx: centerX,
          cy: centerY,
          r: maxSize * random(0.3, 0.5),
          n: Math.floor(random(5, 8)),
        },
        style,
      }),
  },
  {
    type: 'droplet',
    weight: 1,
    usesCenterPoint: true,
    createShape: ({ centerX, centerY, maxSize, style }) =>
      new zrender.Droplet({
        shape: {
          cx: centerX,
          cy: centerY,
          width: maxSize * random(0.4, 0.6),
          height: maxSize * random(0.4, 0.6),
        },
        style,
      }),
  },
  {
    type: 'ellipse',
    weight: 1,
    usesCenterPoint: true,
    createShape: ({ centerX, centerY, maxSize, style }) =>
      new zrender.Ellipse({
        shape: {
          cx: centerX,
          cy: centerY,
          rx: maxSize * random(0.3, 0.5),
          ry: maxSize * random(0.2, 0.4),
        },
        style,
      }),
  },
  {
    type: 'isogon',
    weight: 1,
    usesCenterPoint: false,
    createShape: ({ centerX, centerY, maxSize, style }) =>
      new zrender.Isogon({
        shape: {
          x: centerX,
          y: centerY,
          r: maxSize * random(0.3, 0.5),
          n: Math.floor(random(5, 8)),
        },
        style,
      }),
  },
  {
    type: 'polygon',
    weight: 1,
    usesCenterPoint: false,
    createShape: ({ centerX, centerY, maxSize, style }) => {
      const sides = Math.floor(random(5, 8));
      return new zrender.Polygon({
        shape: {
          points: Array.from({ length: sides }, (_, i) => {
            const angle = (i * 2 * Math.PI) / sides;
            const r = maxSize * random(0.3, 0.5);
            return [
              centerX + r * Math.cos(angle),
              centerY + r * Math.sin(angle),
            ];
          }),
        },
        style,
      });
    },
  },
  {
    type: 'rect',
    weight: 1,
    usesCenterPoint: false,
    createShape: ({ centerX, centerY, maxSize, style }) =>
      new zrender.Rect({
        shape: {
          x: centerX - maxSize * random(0.2, 0.3),
          y: centerY - maxSize * random(0.2, 0.3),
          width: maxSize * random(0.4, 0.6),
          height: maxSize * random(0.4, 0.6),
        },
        style,
      }),
  },
  {
    type: 'ring',
    weight: 1,
    usesCenterPoint: true,
    createShape: ({ centerX, centerY, maxSize, style }) =>
      new zrender.Ring({
        shape: {
          cx: centerX,
          cy: centerY,
          r: maxSize * random(0.3, 0.5),
          r0: maxSize * random(0.1, 0.3),
        },
        style,
      }),
  },
  {
    type: 'rose',
    weight: 1,
    usesCenterPoint: true,
    createShape: ({ centerX, centerY, maxSize, style }) =>
      new zrender.Rose({
        shape: {
          cx: centerX,
          cy: centerY,
          r: [maxSize * random(0.3, 0.5), maxSize * random(0.2, 0.4)],
          n: Math.floor(random(3, 6)),
        },
        style,
      }),
  },
  {
    type: 'sector',
    weight: 1,
    usesCenterPoint: true,
    createShape: ({ centerX, centerY, maxSize, style }) =>
      new zrender.Sector({
        shape: {
          cx: centerX,
          cy: centerY,
          r: maxSize * random(0.3, 0.5),
          r0: maxSize * random(0.1, 0.3),
          startAngle: random(0, Math.PI * 2),
          endAngle: random(0, Math.PI * 2),
        },
        style,
      }),
  },
];

// 全局形状计数器
const globalShapeCounter = {
  counters: new Array(SHAPE_CONFIGS.length).fill(0),
  update(index: number) {
    this.counters.forEach((_, i) => this.counters[i]++);
    this.counters[index] = 0;
  },
  getNextShape() {
    const totalWeight = this.counters.reduce((sum, count) => sum + count, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < this.counters.length; i++) {
      random -= this.counters[i];
      if (random <= 0) {
        return SHAPE_CONFIGS[i];
      }
    }

    return SHAPE_CONFIGS[Math.floor(Math.random() * SHAPE_CONFIGS.length)];
  },
};

// Shape Instance Class
class ShapeInstance {
  private path: zrender.Path;
  private readonly zr: zrender.ZRenderType;
  private readonly width: number;
  private readonly height: number;
  private readonly totalShapes: number;
  private currentShapeIndex: number;
  private readonly position: { x: number; y: number }; // Single fixed position
  private lastMorphTime: number;
  private isMorphing: boolean;
  private readonly lifecycleDuration: number = 2000; // 单个形状的生命周期
  private readonly morphDuration: number = 1500; // 形变和颜色过渡时间
  private readonly pauseDuration: number = 500; // 停顿时间
  private readonly maxTotalLifetime: number = 15000; // 最大总生命周期，防止实例永远不退出
  private creationTime: number; // 实例创建时间
  private isEntranceComplete: boolean = false; // 是否完成入场动画
  private isExiting: boolean = false; // 是否正在执行出场动画
  private morphAnimationRef: any = null; // 存储morph动画引用
  private currentConfig: ShapeConfig; // 存储当前形状配置
  public onExitStart: ((position: { x: number; y: number }) => void) | null =
    null; // 新增：退出开始回调
  public onEntranceComplete:
    | ((position: { x: number; y: number }) => void)
    | null = null; // 新增：入场完成回调

  constructor(
    zr: zrender.ZRenderType,
    width: number,
    height: number,
    initialPosition?: { x: number; y: number }
  ) {
    this.zr = zr;
    this.width = width;
    this.height = height;
    this.currentShapeIndex = 0;
    this.isMorphing = false;
    this.lastMorphTime = 0;
    this.creationTime = performance.now(); // 记录创建时间

    // 随机生成形状总数（3-5个）
    this.totalShapes = Math.floor(random(3, 6));

    // 随机初始位置，确保不要太靠近边缘
    const margin = Math.min(width, height) * 0.1;
    this.position = initialPosition || {
      x: random(margin, width - margin),
      y: random(margin, height - margin),
    };

    // 选择形状配置
    this.currentConfig = this.selectShapeConfig();

    // 创建唯一的形状
    const { path } = this.createShape(this.position, this.currentConfig);
    this.path = path;

    this.zr.add(this.path);

    // 开始入场动画
    this.startEntranceAnimation();
  }

  private selectShapeConfig(): ShapeConfig {
    const selectedConfig = globalShapeCounter.getNextShape();
    globalShapeCounter.update(SHAPE_CONFIGS.indexOf(selectedConfig));
    return selectedConfig;
  }

  private createShape(position: { x: number; y: number }, config: ShapeConfig) {
    const { color } = randomHSLColor();
    const maxSize = Math.min(this.width, this.height) * 0.15;

    const baseStyle = {
      fill: color,
      stroke: '#ffffff',
      lineWidth: 5,
      strokeNoScale: true,
      opacity: 0, // Set initial opacity to 0 for all shapes
    };

    const path = config.createShape({
      centerX: position.x,
      centerY: position.y,
      maxSize,
      style: baseStyle,
    });

    // 设置变换原点为固定中心点
    path.attr({
      originX: position.x,
      originY: position.y,
    });

    return { path, style: baseStyle };
  }

  private startEntranceAnimation(): void {
    // 记录入场动画开始时间
    const entranceStartTime = performance.now();

    // Create opacity animation
    const opacityAnimation = this.path.animate('style', false);

    // Get current style including all properties
    const currentStyle = { ...this.path.style };

    opacityAnimation
      .when(0, {
        ...currentStyle,
        opacity: 0,
      })
      .when(this.morphDuration, {
        ...currentStyle,
        opacity: 1,
      });

    // Store animation reference for cleanup
    this.morphAnimationRef = opacityAnimation;

    opacityAnimation
      .duration(this.morphDuration)
      .done(() => {
        this.isEntranceComplete = true;
        this.lastMorphTime = performance.now();
        this.morphAnimationRef = null;

        // 触发入场完成回调
        if (this.onEntranceComplete) {
          this.onEntranceComplete(this.position);
        }

        // 入场动画完成后立即触发第一次形变，而不是等待update方法检测
        if (this.currentShapeIndex < this.totalShapes - 1 && !this.isExiting) {
          this.startMorphing();
        }
      })
      .start();

    // 设置安全超时，确保入场动画不会卡住
    setTimeout(() => {
      if (!this.isEntranceComplete) {
        console.warn('Entrance animation timeout, forcing completion');
        this.isEntranceComplete = true;
        this.lastMorphTime = performance.now();

        // 触发入场完成回调
        if (this.onEntranceComplete) {
          this.onEntranceComplete(this.position);
        }

        // 清理可能的存留动画引用
        if (this.morphAnimationRef) {
          if (this.morphAnimationRef.stop) {
            this.morphAnimationRef.stop();
          }
          this.morphAnimationRef = null;
        }

        // 入场动画超时完成后也立即触发第一次形变
        if (this.currentShapeIndex < this.totalShapes - 1 && !this.isExiting) {
          this.startMorphing();
        }
      }
    }, this.morphDuration * 1.5); // 给予1.5倍动画时间的宽限
  }

  private startExitAnimation(): void {
    if (this.isExiting) return;
    this.isExiting = true;

    // 触发退出开始回调
    if (this.onExitStart) {
      this.onExitStart(this.position);
    }

    // 先停止任何现有动画
    if (this.morphAnimationRef) {
      if (this.morphAnimationRef.stop) {
        this.morphAnimationRef.stop();
      }
      this.morphAnimationRef = null;
    }

    // 清理正在进行的形变，如果有的话
    this.isMorphing = false;

    // 创建opacity动画for exit
    const opacityAnimation = this.path.animate('style', false);

    // Get current style including all properties
    const currentStyle = { ...this.path.style };

    opacityAnimation
      .when(0, {
        ...currentStyle,
        opacity: currentStyle.opacity || 1,
      })
      .when(this.morphDuration, {
        ...currentStyle,
        opacity: 0,
      });

    // Store animation reference for cleanup
    this.morphAnimationRef = opacityAnimation;

    // 记录退出动画开始时间
    const exitStartTime = performance.now();

    opacityAnimation
      .duration(this.morphDuration)
      .done(() => {
        this.morphAnimationRef = null;
        this.cleanup();
      })
      .start();

    // 设置安全超时，确保即使动画回调失败也能清理资源
    setTimeout(() => {
      if (this.isExiting && !this.path.ignore) {
        console.warn('Exit animation timeout, forcing cleanup');
        this.cleanup();
      }
    }, this.morphDuration * 1.5); // 给予1.5倍动画时间的宽限
  }

  // 清理资源的方法
  private cleanup(): void {
    // 确保所有动画引用被清理
    if (this.morphAnimationRef) {
      if (this.morphAnimationRef.stop) {
        this.morphAnimationRef.stop();
      }
      this.morphAnimationRef = null;
    }

    // 停止所有动画
    this.path.stopAnimation();

    // 标记为忽略渲染
    this.path.attr({ ignore: true });

    // 从渲染器中移除
    this.zr.remove(this.path);

    // 确保状态一致
    this.isExiting = true;
    this.isMorphing = false;
  }

  // 清理所有资源的方法
  dispose(): void {
    // 如果有正在进行的动画，取消它
    if (this.morphAnimationRef && this.morphAnimationRef.stop) {
      this.morphAnimationRef.stop();
      this.morphAnimationRef = null;
    }

    // 停止所有动画
    this.path.stopAnimation();

    // 从ZRender移除
    this.zr.remove(this.path);

    // 标记为已退出
    this.isExiting = true;
  }

  update(currentTime: number): boolean {
    // 检查总生命周期是否超时，强制退出
    const totalLifetime = currentTime - this.creationTime;
    if (totalLifetime > this.maxTotalLifetime && !this.isExiting) {
      this.startExitAnimation();
      return false;
    }

    // 入场动画完成后才开始形变
    // 由于我们现在在入场动画回调中触发了第一次形变
    // 这里只处理后续的形变（当currentShapeIndex > 0时）
    if (
      this.isEntranceComplete &&
      !this.isMorphing &&
      !this.isExiting &&
      this.currentShapeIndex > 0
    ) {
      const elapsed = currentTime - this.lastMorphTime;
      if (elapsed >= this.lifecycleDuration) {
        this.startMorphing();
      }
    }

    // 检测动画是否卡住 - 如果变形动画持续时间超过了预期的两倍，强制重置状态
    if (this.isMorphing && !this.isExiting) {
      const morphingElapsed = currentTime - this.lastMorphTime;
      // 如果变形动画运行时间超过预期的两倍，强制重置
      if (morphingElapsed > this.morphDuration * 2) {
        console.warn('Animation timeout detected, resetting state');
        // 强制重置动画状态
        if (this.morphAnimationRef) {
          if (this.morphAnimationRef.stop) {
            this.morphAnimationRef.stop();
          }
          this.morphAnimationRef = null;
        }
        this.isMorphing = false;
        this.lastMorphTime = currentTime;
      }
    }

    // 如果所有形状都已经完成并且不在出场动画中，开始出场动画
    if (
      this.currentShapeIndex >= this.totalShapes - 1 &&
      !this.isExiting &&
      !this.isMorphing
    ) {
      this.startExitAnimation();
    }

    // 如果正在执行出场动画并且动画已完成，返回true表示可以删除此实例
    return this.isExiting && this.path.ignore;
  }

  private startMorphing(): void {
    if (this.currentShapeIndex >= this.totalShapes - 1) {
      return;
    }

    if (this.isMorphing) return;
    this.isMorphing = true;
    this.lastMorphTime = performance.now();

    // 选择一个新的形状配置
    const newConfig = this.selectShapeConfig();

    // 使用实例的固定位置而不是当前形状的位置
    const fixedPosition = this.position;

    // 创建新形状
    const { color: newColor } = randomHSLColor();
    const maxSize = Math.min(this.width, this.height) * 0.15;

    // 创建新形状，确保opacity设置为1
    const newStyle = {
      fill: newColor,
      stroke: '#ffffff',
      lineWidth: 5,
      strokeNoScale: true,
      opacity: 1, // Explicitly set opacity to 1 for target shape
    };

    const newShape = newConfig.createShape({
      centerX: fixedPosition.x,
      centerY: fixedPosition.y,
      maxSize,
      style: newStyle,
    });

    // 设置变换原点为固定中心点，与源形状一致
    newShape.attr({
      originX: fixedPosition.x,
      originY: fixedPosition.y,
    });

    // 添加新形状到渲染器
    this.zr.add(newShape);

    // 记录当前形状的不透明度状态
    const currentOpacity = this.path.style.opacity || 1;

    // 设置源形状(当前形状)为隐藏
    this.path.attr({
      ignore: true,
    });

    // 确保新形状初始不透明度与当前形状一致
    newShape.attr({
      style: {
        ...newShape.style,
        opacity: currentOpacity,
      },
    });

    // 如果有正在进行的动画，先取消它
    if (this.morphAnimationRef) {
      if (this.morphAnimationRef.stop) {
        this.morphAnimationRef.stop();
      }
      this.morphAnimationRef = null;
    }

    // 设置动画开始时间以用于超时检测
    const morphStartTime = performance.now();

    // 调用morphPath进行变形(from→to)
    this.morphAnimationRef = zrender.morph.morphPath(this.path, newShape, {
      duration: this.morphDuration,
      done: () => {
        // 变形完成后移除旧形状
        this.zr.remove(this.path);

        // 更新为新形状
        this.path = newShape;
        this.currentConfig = newConfig;
        this.currentShapeIndex++;
        this.isMorphing = false;
        this.morphAnimationRef = null;
      },
    });
  }

  // 获取实例位置
  getPosition(): { x: number; y: number } {
    return this.position;
  }
}

// Shape Instance Manager
class ShapeInstanceManager {
  private instances: ShapeInstance[] = [];
  private readonly zr: zrender.ZRenderType;
  private readonly width: number;
  private readonly height: number;
  private readonly minInstances: number = 3;
  private readonly maxInstances: number = 5; // 减少最大实例数量以降低性能压力
  private lastCreationTime: number = 0;
  private onInstancesChanged:
    | ((
        positions: Array<{ x: number; y: number }>,
        exitingPositions: Array<{ x: number; y: number }>
      ) => void)
    | null = null;
  private instancePositions: Array<{ x: number; y: number }> = []; // 缓存所有实例位置
  private exitingPositions: Array<{ x: number; y: number }> = []; // 新增：退出中的实例位置
  private hasPositionsChanged: boolean = false; // 跟踪位置是否有变化
  private lastUpdateTime: number = 0; // 上次更新的时间
  private readonly updateInterval: number = 100; // 位置更新间隔，毫秒
  private readonly minDistanceBetweenShapes: number; // 最小距离要求

  constructor(zr: zrender.ZRenderType, width: number, height: number) {
    this.zr = zr;
    this.width = width;
    this.height = height;
    // 设置最小距离为画布尺寸的一定比例，确保形状不会重叠
    this.minDistanceBetweenShapes = Math.min(width, height) * 0.2;
  }

  private calculateCreationProbability(): number {
    const currentCount = this.instances.length;
    if (currentCount < this.minInstances) return 1;
    if (currentCount >= this.maxInstances) return 0;
    return (
      1 -
      (currentCount - this.minInstances) /
        (this.maxInstances - this.minInstances)
    );
  }

  // 生成不与现有实例重叠的随机位置
  private generateNonOverlappingPosition(): { x: number; y: number } | null {
    const margin = Math.min(this.width, this.height) * 0.1;
    const maxAttempts = 30; // 最大尝试次数，防止无限循环

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidatePosition = {
        x: random(margin, this.width - margin),
        y: random(margin, this.height - margin),
      };

      // 检查与现有实例的距离
      if (this.isPositionValid(candidatePosition)) {
        return candidatePosition;
      }
    }

    // 如果尝试了最大次数仍找不到合适位置，返回null
    return null;
  }

  // 检查位置是否与现有实例保持足够距离
  private isPositionValid(position: { x: number; y: number }): boolean {
    for (const existingPosition of this.instancePositions) {
      const distance = Math.sqrt(
        Math.pow(position.x - existingPosition.x, 2) +
          Math.pow(position.y - existingPosition.y, 2)
      );

      if (distance < this.minDistanceBetweenShapes) {
        return false; // 位置太近
      }
    }

    return true; // 位置合适
  }

  private createInstance(): void {
    // 尝试获取不重叠的位置
    const position = this.generateNonOverlappingPosition();

    // 如果找不到合适位置，跳过创建
    if (!position) {
      return;
    }

    const instance = new ShapeInstance(
      this.zr,
      this.width,
      this.height,
      position
    );

    // 添加退出和入场回调
    instance.onExitStart = (pos) => {
      // 添加到退出中的位置
      this.exitingPositions.push({ ...pos });
      this.hasPositionsChanged = true;
    };

    instance.onEntranceComplete = (pos) => {
      // 入场完成时通知变化
      this.hasPositionsChanged = true;
    };

    this.instances.push(instance);

    // 直接添加新实例的位置到位置缓存
    this.instancePositions.push(instance.getPosition());
    this.hasPositionsChanged = true;
  }

  // 只在需要时更新位置缓存
  private updatePositionsCache(
    currentTime: number,
    forceUpdate: boolean = false
  ): void {
    // 如果强制更新或者位置有变化且自上次更新已过足够时间时才通知变化
    if (
      forceUpdate ||
      (this.hasPositionsChanged &&
        currentTime - this.lastUpdateTime >= this.updateInterval)
    ) {
      // 传递退出中的位置信息
      this.notifyInstancesChanged();
      this.lastUpdateTime = currentTime;
      this.hasPositionsChanged = false;
    }
  }

  update(currentTime: number): void {
    // 减少创建频率，从2000ms增加到3000ms
    if (currentTime - this.lastCreationTime >= 3000) {
      const probability = this.calculateCreationProbability();
      if (Math.random() < probability) {
        this.createInstance();
        // 新实例创建后强制更新位置缓存
        this.updatePositionsCache(currentTime, true);
      }
      this.lastCreationTime = currentTime;
    }

    // 更新实例前先保存当前数量
    const initialCount = this.instances.length;
    let instanceRemoved = false;

    // 使用索引遍历以避免在过滤过程中创建新数组
    for (let i = this.instances.length - 1; i >= 0; i--) {
      const instance = this.instances[i];
      if (instance.update(currentTime)) {
        // 如果实例需要被移除，从实例列表和位置缓存中删除
        this.instances.splice(i, 1);

        // 从普通位置列表中移除
        const position = this.instancePositions[i];
        this.instancePositions.splice(i, 1);

        // 同时从退出位置列表中移除（如果存在）
        const exitingIndex = this.exitingPositions.findIndex(
          (p) => p.x === position.x && p.y === position.y
        );
        if (exitingIndex !== -1) {
          this.exitingPositions.splice(exitingIndex, 1);
        }

        this.hasPositionsChanged = true;
        instanceRemoved = true;
      }
    }

    // 如果有实例被移除，立即强制更新位置缓存
    if (instanceRemoved) {
      this.updatePositionsCache(currentTime, true);
    } else {
      // 正常检查并更新位置缓存
      this.updatePositionsCache(currentTime);
    }
  }

  // 清理所有实例
  dispose(): void {
    this.instances.forEach((instance) => {
      instance.dispose();
    });

    this.instances = [];
    this.instancePositions = [];
  }

  // 设置实例变化的监听器
  setInstancesChangeListener(
    callback: (
      positions: Array<{ x: number; y: number }>,
      exitingPositions: Array<{ x: number; y: number }>
    ) => void
  ): void {
    this.onInstancesChanged = callback;

    // 如果已有实例，立即通知
    if (this.instances.length > 0 || this.exitingPositions.length > 0) {
      this.notifyInstancesChanged();
    }
  }

  // 通知实例变化
  private notifyInstancesChanged(): void {
    if (this.onInstancesChanged) {
      // 同时传递正常位置和正在退出的位置
      this.onInstancesChanged(this.instancePositions, this.exitingPositions);
    }
  }

  // 获取所有实例位置
  getInstancePositions(): Array<{ x: number; y: number }> {
    return this.instancePositions;
  }

  getInstances(): ShapeInstance[] {
    return this.instances;
  }

  // 新增方法：获取退出中的位置
  getExitingPositions(): Array<{ x: number; y: number }> {
    return this.exitingPositions;
  }
}

// React Component
const ShapeMorph = React.forwardRef<
  {
    getInstancePositions: () => Array<{ x: number; y: number }>;
    setInstancesChangeListener: (
      callback: (
        positions: Array<{ x: number; y: number }>,
        exitingPositions: Array<{ x: number; y: number }>
      ) => void
    ) => void;
  },
  ShapeMorphProps
>(({ width, height }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const zrInstanceRef = useRef<zrender.ZRenderType | null>(null);
  const managerRef = useRef<ShapeInstanceManager | null>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);
  const updateIntervalRef = useRef<number>(1000 / 30); // 目标30fps，约33.3ms一帧

  const animate = (currentTime: number): void => {
    if (!zrInstanceRef.current || !managerRef.current) return;

    // 实现帧率控制，只有经过了足够的时间间隔才更新
    const elapsed = currentTime - lastUpdateTimeRef.current;
    if (elapsed >= updateIntervalRef.current) {
      // 计算实际经过的时间，用于确保动画速度一致性
      const actualElapsed = elapsed;

      // 更新时间戳
      lastUpdateTimeRef.current =
        currentTime - (elapsed % updateIntervalRef.current);

      // 执行实例更新，传递实际经过时间
      managerRef.current.update(currentTime);
    }

    // 始终请求下一帧，但实际更新会受控
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 初始化ZRender使用Canvas渲染器而不是SVG
    const zr = zrender.init(containerRef.current, {
      renderer: 'canvas',
      // 移除所有可能不在类型定义中的选项
    });
    zrInstanceRef.current = zr;

    // Initialize instance manager
    managerRef.current = new ShapeInstanceManager(zr, width, height);

    // 初始化时间基准
    lastUpdateTimeRef.current = performance.now();

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Clean up
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }

      // 清理所有实例
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }

      if (zrInstanceRef.current) {
        zrInstanceRef.current.dispose();
        zrInstanceRef.current = null;
      }
    };
  }, [width, height]);

  // 在窗口不可见时暂停动画，减少资源占用
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时停止动画循环
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = undefined;
        }
      } else {
        // 页面可见时恢复动画循环
        if (!animationFrameRef.current && zrInstanceRef.current) {
          lastUpdateTimeRef.current = performance.now();
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 暴露一个方法来获取所有形状实例的位置
  React.useImperativeHandle(ref, () => ({
    getInstancePositions: () => {
      return managerRef.current?.getInstancePositions() || [];
    },
    setInstancesChangeListener: (
      callback: (
        positions: Array<{ x: number; y: number }>,
        exitingPositions: Array<{ x: number; y: number }>
      ) => void
    ) => {
      if (managerRef.current) {
        managerRef.current.setInstancesChangeListener(callback);
      }
    },
  }));

  return (
    <div
      ref={containerRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
        background: 'transparent',
      }}
    />
  );
});

export default ShapeMorph;
