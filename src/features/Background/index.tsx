import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as zrender from 'zrender';
import ShapeMorph from './ShapeMorph';
import BrowserOnly from '@docusaurus/BrowserOnly';

interface HexGridProps {
  className?: string;
}

const HexGridComponent: React.FC<HexGridProps> = ({ className }) => {
  const containerRef = useRef<HTMLCanvasElement>(null);
  const zrInstanceRef = useRef<zrender.ZRenderType | null>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRenderedRef = useRef<boolean>(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const hexBatchesRef = useRef<
    Record<
      string,
      Array<{ group: zrender.Group; position: { x: number; y: number } }>
    >
  >({});

  const shapeMorphRef = useRef<{
    getInstancePositions: () => Array<{ x: number; y: number }>;
    setInstancesChangeListener: (
      callback: (
        positions: Array<{ x: number; y: number }>,
        exitingPositions: Array<{ x: number; y: number }>
      ) => void
    ) => void;
  }>(null);

  // 常量定义
  const MIN_SCALE = 0.3; // 最小缩放为30%
  const TRANSITION_DURATION = 1500; // 过渡时间
  const INFLUENCE_RADIUS = 300; // 影响半径
  const INFLUENCE_RADIUS_SQ = INFLUENCE_RADIUS * INFLUENCE_RADIUS; // 预计算平方值
  const BATCH_PRECISION = 100; // 批处理精度 (例如: 100表示保留2位小数)

  // 六边形集合及其关联数据 - 重构为Map对象，按行列索引，便于快速查找
  const hexagonsRef = useRef<
    Map<
      string,
      {
        group: zrender.Group;
        fillShape: zrender.Polygon;
        position: { x: number; y: number };
        currentScale: number;
        isVisible: boolean;
      }
    >
  >(new Map());

  // 创建六边形路径点 - 使用useMemo缓存点坐标
  const createHexagonPoints = useMemo(
    () => (size: number) => {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (2 * Math.PI * i) / 6;
        points.push([
          Math.floor(size * Math.cos(angle)),
          Math.floor(size * Math.sin(angle)),
        ]);
      }
      return points;
    },
    []
  );

  // 视口判断函数 - 确定六边形是否在视口内
  const isInViewport = (
    x: number,
    y: number,
    hexSize: number,
    width: number,
    height: number
  ): boolean => {
    // 扩展边界以避免边缘闪烁
    const margin = hexSize * 3;
    return (
      x + hexSize > -margin &&
      x - hexSize < width + margin &&
      y + hexSize > -margin &&
      y - hexSize < height + margin
    );
  };

  // 处理实例位置变化的回调 - 只在创建和销毁时调用
  const handleInstancesChanged = (
    positions: Array<{ x: number; y: number }>,
    exitingPositions: Array<{ x: number; y: number }>
  ) => {
    if (!zrInstanceRef.current) return;

    // 更新所有六边形的缩放
    requestAnimationFrame(() => {
      // 传递正常位置和退出中的位置
      updateHexagonsScale(positions, exitingPositions);
    });
  };

  // 优化的距离计算 - 使用距离平方避免平方根操作
  const calculateHexScale = (
    hexX: number,
    hexY: number,
    morphPositions: Array<{ x: number; y: number; isExiting?: boolean }>
  ) => {
    if (morphPositions.length === 0) return 1; // 没有实例时不缩放

    // 计算到最近实例的距离平方及其状态
    let minDistanceSq = Infinity;
    let closestPointIsExiting = false;

    for (const pos of morphPositions) {
      const dx = hexX - pos.x;
      const dy = hexY - pos.y;
      const distanceSq = dx * dx + dy * dy;

      if (distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        closestPointIsExiting = !!pos.isExiting;
      }
    }

    // 距离超过影响半径时不缩放
    if (minDistanceSq > INFLUENCE_RADIUS_SQ) return 1;

    // 计算基础缩放比例
    const distanceRatio = Math.sqrt(minDistanceSq) / INFLUENCE_RADIUS;

    // 根据是否为退出中的位置调整缩放行为
    if (closestPointIsExiting) {
      // 退出中的点：随着距离增加缩放值变大（恢复原大小）
      // 贴近退出点时保持MIN_SCALE，远离时逐渐恢复到1
      return (
        MIN_SCALE + (1 - MIN_SCALE) * (1 - Math.pow(1 - distanceRatio, 0.8))
      );
    } else {
      // 普通点：距离越近，缩放越小
      return MIN_SCALE + (1 - MIN_SCALE) * Math.pow(distanceRatio, 0.8);
    }
  };

  // 批量处理动画更新 - 修改为更直接的方式应用动画
  const updateHexagonsScale = (
    morphPositions: Array<{ x: number; y: number }>,
    exitingPositions: Array<{ x: number; y: number }> = []
  ) => {
    if (!zrInstanceRef.current) return;

    // 合并所有需要考虑的位置，但给退出中的位置添加权重标记
    const allPositions = [
      ...morphPositions.map((pos) => ({ ...pos, isExiting: false })),
      ...exitingPositions.map((pos) => ({ ...pos, isExiting: true })),
    ];

    // 按缩放值分批处理
    hexagonsRef.current.forEach((hexData, key) => {
      const { group, fillShape, position, currentScale, isVisible } = hexData;

      // 跳过不可见的六边形
      if (!isVisible) return;

      const { x, y } = position;

      // 计算新的缩放值 - 考虑退出状态
      const rawScale = calculateHexScale(x, y, allPositions);
      const newScale = Math.round(rawScale * BATCH_PRECISION) / BATCH_PRECISION;

      // 如果缩放值变化不大，跳过动画
      if (Math.abs(newScale - currentScale) < 0.01) return;

      // 直接对fillShape应用动画
      fillShape.stopAnimation();
      (fillShape as any).animateTo(
        {
          scale: [newScale, newScale],
        },
        {
          duration: TRANSITION_DURATION,
          easing: 'cubicOut',
        }
      );

      // 更新缩放值引用
      hexData.currentScale = newScale;
    });

    // 刷新渲染
    zrInstanceRef.current.refreshImmediately();
  };

  // 创建颜色渐变 - 使用坐标比例
  const createColorGradient = (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const xRatio = x / width;
    const yRatio = y / height;
    const ratio = (xRatio + yRatio) / 2;

    // 更明亮的填充色渐变
    if (ratio <= 0.5) {
      const color = ratio * 2;
      // 从浅蓝色(#c4e3ff)到亮紫色(#e0c4ff)
      return `rgba(${Math.round(196 + (224 - 196) * color)}, ${Math.round(
        227 + (196 - 227) * color
      )}, ${Math.round(255)}, 0.9)`;
    } else {
      const color = (ratio - 0.5) * 2;
      // 从亮紫色(#e0c4ff)到粉色(#ffc4e0)
      return `rgba(${Math.round(224 + (255 - 224) * color)}, ${Math.round(
        196 + (196 - 196) * color
      )}, ${Math.round(255 + (224 - 255) * color)}, 0.9)`;
    }
  };

  // 创建边框颜色渐变
  const createBorderColorGradient = (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const xRatio = x / width;
    const yRatio = y / height;
    const ratio = (xRatio + yRatio) / 2;

    // 更明亮的边框渐变 从浅蓝色(#84d8ff)到亮粉色(#ff84d8)
    const r = Math.round(132 + (255 - 132) * ratio);
    const g = Math.round(216 + (132 - 216) * ratio);
    const b = Math.round(255 + (216 - 255) * ratio);

    return `rgba(${r}, ${g}, ${b}, 0.8)`; // 降低不透明度让它更轻盈
  };

  // 绘制六边形边框到离屏Canvas
  const renderOffscreenBorders = (width: number, height: number) => {
    // 如果已经渲染过且没有resize，则跳过
    if (
      offscreenCanvasRenderedRef.current &&
      staticCanvasRef.current &&
      staticCanvasRef.current.width === width &&
      staticCanvasRef.current.height === height
    ) {
      return;
    }

    console.log('Rendering borders to offscreen canvas', width, height);

    // 确保离屏Canvas已创建
    if (!staticCanvasRef.current) {
      staticCanvasRef.current = document.createElement('canvas');
      // 直接将边框Canvas添加到DOM，而不是仅作为离屏缓存
      staticCanvasRef.current.style.position = 'fixed';
      staticCanvasRef.current.style.top = '0';
      staticCanvasRef.current.style.left = '0';
      staticCanvasRef.current.style.width = '100%';
      staticCanvasRef.current.style.height = '100%';
      staticCanvasRef.current.style.zIndex = '-2'; // 边框层在fillGroup之上
      staticCanvasRef.current.style.pointerEvents = 'none'; // 不响应鼠标事件
      staticCanvasRef.current.style.background = 'transparent'; // 确保背景透明
      document.body.appendChild(staticCanvasRef.current);
    }

    // 设置Canvas尺寸与窗口一致
    const canvas = staticCanvasRef.current;
    canvas.width = width;
    canvas.height = height;

    // 确保使用alpha通道
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // 清除Canvas内容，确保完全透明
    ctx.clearRect(0, 0, width, height);

    // 设置合成操作以保持透明度
    ctx.globalCompositeOperation = 'source-over';

    // 定义六边形尺寸和布局
    const hexSize = 32;
    const hexWidth = hexSize * 2;
    const hexHeight = Math.sqrt(3) * hexSize;

    // 计算需要的六边形数量
    const cols = Math.ceil(width / (hexWidth * 0.75)) + 1;
    const rows = Math.ceil(height / hexHeight) + 1;

    // 创建六边形点集
    const hexPoints = createHexagonPoints(hexSize);

    // 绘制所有边框
    let borderCount = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * hexWidth * 0.75;
        const y = row * hexHeight + ((col % 2) * hexHeight) / 2;

        // 视口裁剪 - 只绘制可见区域内的六边形
        if (!isInViewport(x, y, hexSize, width, height)) continue;

        borderCount++;

        // 绘制边框
        ctx.save();
        ctx.translate(x, y);

        // 边框 - 只绘制线条，不填充
        const borderColor = createBorderColorGradient(x, y, width, height);
        ctx.beginPath();
        hexPoints.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point[0], point[1]);
          else ctx.lineTo(point[0], point[1]);
        });
        ctx.closePath();
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1.0;
        // 只描边，不填充
        ctx.stroke();

        // 高亮
        ctx.beginPath();
        hexPoints.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point[0] - 0.8, point[1] - 0.8);
          else ctx.lineTo(point[0] - 0.8, point[1] - 0.8);
        });
        ctx.closePath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6; // 增加高亮强度
        // 只描边，不填充
        ctx.stroke();

        // 阴影
        ctx.beginPath();
        hexPoints.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point[0] + 0.8, point[1] + 0.8);
          else ctx.lineTo(point[0] + 0.8, point[1] + 0.8);
        });
        ctx.closePath();
        ctx.strokeStyle = '#a0d0ff'; // 更亮的蓝色阴影
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3; // 减小阴影不透明度
        // 只描边，不填充
        ctx.stroke();

        ctx.restore();
      }
    }

    console.log(`Rendered ${borderCount} hexagon borders`);

    // 标记为已渲染
    offscreenCanvasRenderedRef.current = true;
  };

  // 创建背景图层并渲染静态边框 - 不再需要这个函数，边框直接显示
  const renderBackground = () => {
    if (!containerRef.current) return;

    // 创建背景层Canvas - 仅用于背景色
    const bgCanvasRef = document.createElement('canvas');
    bgCanvasRef.width = window.innerWidth;
    bgCanvasRef.height = window.innerHeight;
    bgCanvasRef.style.position = 'fixed';
    bgCanvasRef.style.top = '0';
    bgCanvasRef.style.left = '0';
    bgCanvasRef.style.width = '100%';
    bgCanvasRef.style.height = '100%';
    bgCanvasRef.style.zIndex = '-5'; // 确保在fillGroup之下
    bgCanvasRef.style.pointerEvents = 'none';
    document.body.appendChild(bgCanvasRef);

    console.log(
      'Background canvas created',
      bgCanvasRef.width,
      bgCanvasRef.height
    );

    // 检测当前是否为暗色模式
    const prefersDarkMode =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 渲染背景
    const renderFrame = () => {
      if (!bgCanvasRef) return;

      const bgCtx = bgCanvasRef.getContext('2d');
      if (!bgCtx) return;

      // 清除背景
      bgCtx.clearRect(0, 0, bgCanvasRef.width, bgCanvasRef.height);

      // 创建径向渐变，这样更好地适配任何方向的变化
      const gradient = bgCtx.createRadialGradient(
        bgCanvasRef.width * 0.5,
        bgCanvasRef.height * 0.5,
        0,
        bgCanvasRef.width * 0.5,
        bgCanvasRef.height * 0.5,
        Math.max(bgCanvasRef.width, bgCanvasRef.height) * 0.7
      );

      if (prefersDarkMode) {
        // 暗色模式 - 使用更明亮、更鲜艳的蓝紫色调
        gradient.addColorStop(0, 'rgba(90, 120, 180, 0.9)'); // 亮蓝色
        gradient.addColorStop(0.5, 'rgba(110, 90, 170, 0.85)'); // 亮紫色
        gradient.addColorStop(1, 'rgba(140, 80, 160, 0.8)'); // 紫红色
      } else {
        // 亮色模式 - 使用非常浅的彩色调
        gradient.addColorStop(0, 'rgba(235, 245, 255, 0.7)'); // 极浅的蓝色
        gradient.addColorStop(0.5, 'rgba(245, 240, 255, 0.6)'); // 极浅的紫色
        gradient.addColorStop(1, 'rgba(255, 240, 250, 0.5)'); // 极浅的粉色
      }

      bgCtx.fillStyle = gradient;
      bgCtx.fillRect(0, 0, bgCanvasRef.width, bgCanvasRef.height);

      // 请求下一帧
      animationFrameIdRef.current = requestAnimationFrame(renderFrame);
    };

    // 监听颜色模式变化
    const darkModeMediaQuery = window.matchMedia(
      '(prefers-color-scheme: dark)'
    );
    darkModeMediaQuery.addEventListener('change', renderFrame);

    // 启动渲染循环
    animationFrameIdRef.current = requestAnimationFrame(renderFrame);

    // 返回清理函数
    return () => {
      if (bgCanvasRef && bgCanvasRef.parentNode) {
        bgCanvasRef.parentNode.removeChild(bgCanvasRef);
      }
      // 同时清理静态边框Canvas
      if (staticCanvasRef.current && staticCanvasRef.current.parentNode) {
        staticCanvasRef.current.parentNode.removeChild(staticCanvasRef.current);
      }
      // 移除颜色模式监听器
      darkModeMediaQuery.removeEventListener('change', renderFrame);
    };
  };

  // 初始化六边形网格 - 只创建动态填充部分
  const initHexGrid = (width: number, height: number) => {
    if (!zrInstanceRef.current) return;

    const zr = zrInstanceRef.current;

    // 确保离屏Canvas边框已渲染
    renderOffscreenBorders(width, height);

    // 定义六边形尺寸和布局
    const hexSize = 32;
    const hexWidth = hexSize * 2;
    const hexHeight = Math.sqrt(3) * hexSize;

    // 计算需要的六边形数量
    const cols = Math.ceil(width / (hexWidth * 0.75)) + 1;
    const rows = Math.ceil(height / hexHeight) + 1;

    // 创建六边形点集
    const hexPoints = createHexagonPoints(hexSize);

    // 清理现有内容
    zr.clear();

    // 创建根组
    const rootGroup = new zrender.Group();
    zr.add(rootGroup);

    // 创建网格 - 只创建填充部分
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = Math.floor(col * hexWidth * 0.75);
        const y = Math.floor(row * hexHeight + ((col % 2) * hexHeight) / 2);

        // 视口裁剪 - 只创建可见区域内的六边形
        const isVisible = isInViewport(x, y, hexSize, width, height);
        if (!isVisible) continue;

        // 创建六边形组
        const hexGroup = new zrender.Group();
        (hexGroup as any).attr({
          x,
          y,
        });

        // 创建填充六边形
        const fillColor = createColorGradient(x, y, width, height);
        const fillHex = new zrender.Polygon({
          shape: {
            points: hexPoints as any,
          },
          style: {
            fill: fillColor,
            opacity: 0.8,
          },
          zlevel: 0, // 确保在最底层
          silent: true, // 不响应事件
        });

        // 添加到组
        hexGroup.add(fillHex);
        rootGroup.add(hexGroup);

        // 存储六边形数据以便后续更新
        const hexKey = `${row}-${col}`;
        hexagonsRef.current.set(hexKey, {
          group: hexGroup,
          fillShape: fillHex,
          position: { x, y },
          currentScale: 1,
          isVisible,
        });
      }
    }

    // 强制刷新
    zr.refresh();
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 获取窗口尺寸
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 设置canvas尺寸
    containerRef.current.width = width;
    containerRef.current.height = height;

    // 初始化ZRender - 使用Canvas渲染器
    const zr = zrender.init(containerRef.current, {
      renderer: 'canvas',
      width,
      height,
      devicePixelRatio: window.devicePixelRatio,
    });
    zrInstanceRef.current = zr;

    // 先渲染边框 - 确保它在fillGroup之上
    renderOffscreenBorders(width, height);

    // 然后渲染背景和初始化fillGroup
    const cleanupBackground = renderBackground();
    initHexGrid(width, height);

    // 如果ShapeMorph已就绪，获取当前实例位置并更新
    if (shapeMorphRef.current) {
      const positions = shapeMorphRef.current.getInstancePositions();
      if (positions.length > 0) {
        updateHexagonsScale(positions);
      }
    }

    // 清理函数
    return () => {
      if (zrInstanceRef.current) {
        zrInstanceRef.current.dispose();
        zrInstanceRef.current = null;
      }

      // 清除动画帧
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      // 调用背景清理函数
      if (cleanupBackground) cleanupBackground();

      hexagonsRef.current.clear();
      hexBatchesRef.current = {};
    };
  }, []);

  // 注册ShapeMorph实例变化监听器
  useEffect(() => {
    if (shapeMorphRef.current) {
      shapeMorphRef.current.setInstancesChangeListener(handleInstancesChanged);

      // 初始化时获取当前实例位置
      const positions = shapeMorphRef.current.getInstancePositions();
      if (positions.length > 0 && zrInstanceRef.current) {
        updateHexagonsScale(positions);
      }
    }
  }, []);

  // 处理窗口大小变化 - 优化重新渲染流程
  useEffect(() => {
    const handleResize = () => {
      if (zrInstanceRef.current && containerRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 重置缓存标志
        offscreenCanvasRenderedRef.current = false;

        // 重新渲染静态边框
        renderOffscreenBorders(width, height);

        // 清除现有六边形
        zrInstanceRef.current.clear();
        hexagonsRef.current.clear();

        // 调整ZRender尺寸
        zrInstanceRef.current.resize({
          width,
          height,
        });

        // 重新创建六边形网格
        initHexGrid(width, height);

        // 更新缩放
        if (shapeMorphRef.current) {
          const positions = shapeMorphRef.current.getInstancePositions();
          if (positions.length > 0) {
            updateHexagonsScale(positions);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={containerRef}
        className={className}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: '-4', // fillGroup在底层，但在背景上方
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: '1', // 形变实例层（最上层）
          background: 'transparent',
          padding: 0,
          pointerEvents: 'none',
        }}
      >
        <ShapeMorph
          ref={shapeMorphRef}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      </div>
    </>
  );
};

// Export the component wrapped in BrowserOnly
const HexGrid: React.FC<HexGridProps> = (props) => {
  return <BrowserOnly>{() => <HexGridComponent {...props} />}</BrowserOnly>;
};

export default HexGrid;
