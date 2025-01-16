const hexSize = 30;

// 缓存已计算的坐标
const coordinatesCache = new Map();
// 记录每一圈是否已满
const ringFullCache = new Map();

// 计算第n圈的六边形坐标
function getHexagonRingCoordinates(n) {
  // 如果缓存中存在，直接返回
  if (coordinatesCache.has(n)) {
    return coordinatesCache.get(n);
  }

  const coordinates = [];

  if (n === 0) {
    // 中心点
    const result = [{ x: 0, y: 0, angle: 0, occupied: false }];
    coordinatesCache.set(0, result);
    return result;
  }

  // 六边形的边长为hexSize
  // 计算六边形中心到中心的距离
  const centerDistance = hexSize * 2;

  // 对于第n层，我们需要遍历六个方向
  for (let side = 0; side < 6; side++) {
    // 在每个边上，我们需要放置n个六边形
    for (let i = 0; i < n; i++) {
      // 从当前边的起始点开始
      let x = 0,
        y = 0;

      // 计算当前边的基准点（第一个六边形的位置）
      const startX = n * centerDistance * Math.cos((side * Math.PI) / 3);
      const startY = n * centerDistance * Math.sin((side * Math.PI) / 3);

      // 根据在当前边上的位置计算偏移
      const offsetX = centerDistance * Math.cos(((side + 2) * Math.PI) / 3);
      const offsetY = centerDistance * Math.sin(((side + 2) * Math.PI) / 3);

      // 计算最终位置
      x = startX + i * offsetX;
      y = startY + i * offsetY;

      // 计算角度（用于后续可能的旋转）
      const angle = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

      coordinates.push({
        x,
        y,
        angle,
        occupied: false,
      });
    }
  }

  // 存入缓存
  coordinatesCache.set(n, coordinates);
  return coordinates;
}

// 检查某一圈是否已满
function isRingFull(n) {
  if (ringFullCache.has(n)) {
    return ringFullCache.get(n);
  }

  if (!coordinatesCache.has(n)) {
    return false;
  }

  const coordinates = coordinatesCache.get(n);
  const isFull = coordinates.every((coord) => coord.occupied);
  ringFullCache.set(n, isFull);
  return isFull;
}

// 设置坐标点的占用状态
function setCoordinateOccupied(n, index, occupied = true) {
  if (coordinatesCache.has(n)) {
    const coordinates = coordinatesCache.get(n);
    if (coordinates[index]) {
      coordinates[index].occupied = occupied;
      // 检查这一圈是否已满
      if (occupied && coordinates.every((coord) => coord.occupied)) {
        ringFullCache.set(n, true);
      } else {
        ringFullCache.set(n, false);
      }
    }
  }
}

function hexLayout(nodes) {
  // step1: prepare data
  const rootNode = nodes.find((node) => node.isRoot);
  const rootX = rootNode.x;
  const rootY = rootNode.y;

  const nodesCopy = nodes.map((node) => ({
    ...node,
    x: node.x - rootX,
    y: node.y - rootY,
    placed: false,
    // Calculate angle in radians relative to positive x-axis
    angle: Math.atan2(node.y - rootY, node.x - rootX),
    // Also provide angle in degrees for convenience
    angleDeg: (Math.atan2(node.y - rootY, node.x - rootX) * 180) / Math.PI,
  }));

  // Sort nodes by time (ascending order)
  nodesCopy.sort((a, b) => a.time - b.time);

  // step2: layout
  nodesCopy.forEach((node) => {
    if (node.isRoot) {
      node.x = 0;
      node.y = 0;
      node.placed = true;
      return;
    }

    let ring = 0;
    let found = false;

    while (!found) {
      // 如果这一圈已满，直接跳到下一圈
      if (isRingFull(ring)) {
        ring++;
        continue;
      }

      const coordinates = getHexagonRingCoordinates(ring);

      // Find the coordinate with minimum angle difference and not occupied
      let minAngleDiff = Infinity;
      let bestCoordinate = null;
      let bestIndex = -1;

      coordinates.forEach((coord, index) => {
        if (!coord.occupied) {
          // Calculate the angle difference
          let angleDiff = Math.abs(coord.angle - node.angleDeg);
          // Normalize angle difference to [0, 180]
          if (angleDiff > 180) {
            angleDiff = 360 - angleDiff;
          }

          if (angleDiff < minAngleDiff) {
            minAngleDiff = angleDiff;
            bestCoordinate = coord;
            bestIndex = index;
          }
        }
      });

      const ANGLE_THRESHOLD = 5; // 设置角度偏差阈值为5度
      if (bestCoordinate && minAngleDiff <= ANGLE_THRESHOLD) {
        // Found a suitable position with acceptable angle difference
        node.x = bestCoordinate.x;
        node.y = bestCoordinate.y;
        node.placed = true;
        setCoordinateOccupied(ring, bestIndex, true);
        found = true;
      } else {
        // Either no position found or angle difference too large, try next ring
        ring++;
      }
    }
  });

  return nodesCopy;
}
