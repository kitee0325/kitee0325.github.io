function sineLayout(series, order) {
  const orderedSeries = order.map((index) => series[index]);

  const baseline = calcBaseline(orderedSeries);

  const firstSeries = orderedSeries[0];

  baseline.forEach((value, index) => {
    firstSeries[index][0] += value;
    firstSeries[index][1] += firstSeries[index][0];
  });

  for (let i = 1; i < orderedSeries.length; i++) {
    const previousSeries = orderedSeries[i - 1];
    const currentSeries = orderedSeries[i];

    for (let j = 0; j < baseline.length; j++) {
      const previousValue = isNaN(previousSeries[j][1])
        ? previousSeries[j][0]
        : previousSeries[j][1];
      currentSeries[j][0] = previousValue;
      currentSeries[j][1] += previousValue;
    }
  }
}

function calcBaseline(series) {
  const seriesLength = series.length;
  if (seriesLength === 0) return;

  const timeLength = series[0].length;
  const baseline = Array(series[0].length).fill(0);

  for (let t = 0; t < timeLength; t++) {
    let totalY = 0;
    for (let s = 0; s < seriesLength; s++) {
      totalY += series[s][t][1] || 0;
    }

    if (t === 0) {
      baseline[t] = -totalY * 0.5;
      continue;
    }

    const gaussC = calcGaussC(series, t);
    const gaussDelta = calcGaussDelta(series, gaussC, t);

    baseline[t] = baseline[t - 1] + gaussDelta;
  }

  return baseline;
}

function calcGaussC(series, t) {
  let totalDFi = [];
  let C = 1;
  for (let s = 0; s < series.length; s++) {
    const cur = series[s][t][1] || 0;
    const pre = series[s][t - 1][1] || 0;
    totalDFi.push(Math.abs(cur - pre));
  }

  // notice: there only select the median value of totalDFi
  totalDFi.sort((a, b) => a - b);

  if (totalDFi.length % 2 !== 0) {
    C = totalDFi[(totalDFi.length - 1) / 2];
  } else {
    C = (totalDFi[totalDFi.length / 2] + totalDFi[totalDFi.length / 2 - 1]) / 2;
  }

  return C;
}

function calcGaussDelta(series, C, t) {
  const dFi = [];
  const Fi = [];
  const Qi = [];

  for (let s = 0; s < series.length; s++) {
    const cur = series[s][t][1] || 0;
    const pre = series[s][t - 1][1] || 0;
    Fi.push(cur);
    dFi.push(cur - pre);
  }

  for (let s = 0; s < series.length; s++) {
    const p = 2 * dFi.slice(0, s + 1).reduce((sum, value) => sum + value, 0);
    Qi.push((p - dFi[s]) / 2);
  }

  let numerator = 0;
  let denominator = 0;

  for (let s = 0; s < series.length; s++) {
    const gaussParameter =
      C === 0 ? 1 : Math.exp(-(dFi[s] * dFi[s]) / (2 * C * C));
    const cur = gaussParameter * Fi[s];
    denominator += cur;
    numerator += cur * Qi[s];
  }

  if (denominator === 0) {
    let totalSize = 0;
    for (let s = 0; s < series.length; s++) {
      totalSize += series[s][t - 1][1] || 0;
    }
    return totalSize / 2;
  }

  return -(numerator / denominator);
}

function hierarchicalClusteringOrder(series) {
  const shuffleSeries = getShuffledCopy(series);
  const seriesNodes = shuffleSeries.map((d, i) => createSeriesNode(d, i));
  let seriesOrder = Array.from({ length: series.length }, (_, i) => i);

  if (series.length <= 1) {
    return seriesOrder;
  }

  const distanceMatrix = Array.from({ length: series.length * 2 - 1 }, () =>
    Array(series.length * 2 - 1).fill(-1)
  );

  for (let i = 0; i < series.length * 2 - 1; i++) {
    distanceMatrix[i][i] = 0;
  }

  let curIndex = seriesNodes.length;
  while (seriesNodes.length > 1) {
    let layerToPick_A,
      layerToPick_B,
      minLayerDistance = Infinity;

    for (let i = 0; i < seriesNodes.length - 1; i++) {
      for (let j = i + 1; j < seriesNodes.length; j++) {
        let cur = 0;
        if (distanceMatrix[seriesNodes[i].index][seriesNodes[j].index] === -1) {
          cur = getDistanceOfSeriesNode(seriesNodes[i], seriesNodes[j]);
          distanceMatrix[seriesNodes[i].index][seriesNodes[j].index] = cur;
          distanceMatrix[seriesNodes[j].index][seriesNodes[i].index] = cur;
        } else {
          cur = distanceMatrix[seriesNodes[i].index][seriesNodes[j].index];
        }

        if (cur < minLayerDistance) {
          minLayerDistance = cur;
          layerToPick_A = i;
          layerToPick_B = j;
        }
      }
    }

    seriesNodes.push(
      treeSeriesNode(
        seriesNodes[layerToPick_A],
        seriesNodes[layerToPick_B],
        curIndex
      )
    );
    curIndex++;

    seriesNodes.splice(layerToPick_B, 1);
    seriesNodes.splice(layerToPick_A, 1);
  }

  let mMatrix = Array.from({ length: series.length * 2 - 1 }, () => new Map());

  mMatrix = getOrderHierarchicalClustering(
    seriesNodes[0],
    distanceMatrix,
    mMatrix
  );

  let curValue = Infinity;

  for (var [key, value] of mMatrix[series.length * 2 - 1 - 1]) {
    if (value[0] < curValue) {
      curValue = value[0];
      seriesOrder = value[1];
    }
  }

  return seriesOrder;
}

function getShuffledCopy(array) {
  const newArray = structuredClone
    ? structuredClone(array)
    : JSON.parse(JSON.stringify(array));
  const shuffledIndices = [
    47, 112, 18, 95, 63, 2, 130, 84, 39, 107, 71, 26, 99, 55, 10, 123, 79, 34,
    102, 58, 15, 135, 91, 42, 115, 67, 22, 86, 50, 7, 119, 75, 30, 103, 59, 14,
    127, 83, 38, 111, 62, 19, 94, 46,
  ];
  //   newArray.sort(() => Math.random() - 0.5);

  newArray.sort((a, b) => {
    return shuffledIndices.indexOf(a) - shuffledIndices.indexOf(b);
  });

  return newArray;
}

function createSeriesNode(nodeA, index) {
  const value = nodeA.map((d) => d[1]);

  return {
    index,
    key: nodeA.key,
    value,
    leave: nodeA,
    dFi: value.slice(1).map((d, i) => d - value[i]),
    maxValue: Math.max(...value),
  };
}

function treeSeriesNode(nodeA, nodeB, index) {
  const value = nodeA.value.map((d, i) => d + nodeB.value[i]);
  return {
    index,
    key: `${index}`,
    value,
    children: [nodeA, nodeB],
    leftChild: nodeA,
    rightChild: nodeB,
    dFi: value.slice(1).map((d, i) => d - value[i]),
    maxValue: Math.max(...value),
  };
}

function getDistanceOfSeriesNode(nodeA, nodeB) {
  let distance = 0;
  let count = nodeA.value.length - 1;

  for (let i = 0; i < nodeA.value.length - 1; i++) {
    if (nodeA.dFi[i] + nodeB.dFi[i] === 0) {
      if (
        nodeA.value[i + 1] + nodeB.value[i + 1] === 0 &&
        nodeA.value[i] + nodeB.value[i] === 0
      ) {
        count--;
        continue;
      }
    } else {
      distance +=
        Math.abs(nodeA.dFi[i] + nodeB.dFi[i]) /
        (Math.abs(nodeA.dFi[i]) + Math.abs(nodeB.dFi[i]));
    }
  }

  if (count === 0) {
    return 0;
  }

  let sizeWeight = 0;
  distance /= count;
  // notice: here weightType is 'max'
  let curMaxSize = -Infinity;
  for (let i = 0; i <= nodeA.value.length - 1; i++) {
    curMaxSize = Math.max(curMaxSize, nodeA.value[i] + nodeB.value[i]);
  }
  sizeWeight = curMaxSize;

  // 这里做的工作是要对比较短的layer进行惩罚
  let lengthWeight = 0,
    length_ASize = 0,
    length_BSize = 0;

  const lengthWeightThresholdValue = 9;
  for (let i = 0; i <= nodeA.value.length - 1; i++) {
    if (nodeA.value[i] > nodeA.maxValue / lengthWeightThresholdValue) {
      length_ASize++;
    }
    if (nodeB.value[i] > nodeB.maxValue / lengthWeightThresholdValue) {
      length_BSize++;
    }
  }

  if (length_ASize === 0 || length_BSize === 0) {
    lengthWeight = 1;
  } else {
    lengthWeight = Math.max(
      nodeA.value.length / length_ASize,
      nodeA.value.length / length_BSize
    );
  }

  distance *= sizeWeight;
  distance *= lengthWeight;
  return distance;
}

function getOrderHierarchicalClustering(seriesNode, distanceMatrix, mMatrix) {
  if (seriesNode.leave) {
    mMatrix[seriesNode.index].set(seriesNode.index + '_' + seriesNode.index, [
      0,
      [seriesNode.index],
    ]);
    return mMatrix;
  }

  mMatrix = getOrderHierarchicalClustering(
    seriesNode.leftChild,
    distanceMatrix,
    mMatrix
  );
  mMatrix = getOrderHierarchicalClustering(
    seriesNode.rightChild,
    distanceMatrix,
    mMatrix
  );

  let nodesLeftLeft = [], // the left ChildNodes of leftChild
    nodesLeftRight = [], // the left ChildNodes of rightChild
    nodesRightLeft = [], // the right ChildNodes of leftChild
    nodesRightRight = []; // the right ChildNodes of rightChild
  if (seriesNode.leftChild.leave !== undefined) {
    //if the leftChild Node is a leaf node
    nodesLeftLeft.push(seriesNode.leftChild.index);
    nodesLeftRight.push(seriesNode.leftChild.index);
  } else {
    nodesLeftLeft = getAllLeavesInternalNode(seriesNode.leftChild.leftChild);
    nodesLeftRight = getAllLeavesInternalNode(seriesNode.leftChild.rightChild);
  }

  if (seriesNode.rightChild.leave !== undefined) {
    //if the rightChild Node is a leaf node
    nodesRightLeft.push(seriesNode.rightChild.index);
    nodesRightRight.push(seriesNode.rightChild.index);
  } else {
    nodesRightLeft = getAllLeavesInternalNode(seriesNode.rightChild.leftChild);
    nodesRightRight = getAllLeavesInternalNode(
      seriesNode.rightChild.rightChild
    );
  }

  let nodesLeft = [nodesLeftLeft, nodesLeftRight];
  let nodesRight = [nodesRightLeft, nodesRightRight];

  let enumNodes = [
    [0, 0, 1, 1],
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 1, 0, 0],
  ];

  for (let e = 0; e < enumNodes.length; e++) {
    let nodesLL = nodesLeft[enumNodes[e][0]];
    let nodesRR = nodesRight[enumNodes[e][1]];
    let nodesLR = nodesLeft[enumNodes[e][2]];
    let nodesRL = nodesRight[enumNodes[e][3]];
    for (let u = 0; u < nodesLL.length; u++) {
      for (let w = 0; w < nodesRR.length; w++) {
        // mMatrix(v, u, w) = Infinity
        let curMin = Infinity;
        for (let m = 0; m < nodesLR.length; m++) {
          for (let k = 0; k < nodesRL.length; k++) {
            // mMatrix(v, u, w) = Math.max(mMatrix(v, u, w), mMatrix(v.leftChild, u, m) + mMatrix(v.rightChild, k, w) + S(m, k));
            let cur =
              mMatrix[seriesNode.leftChild.index].get(
                nodesLL[u] + '_' + nodesLR[m]
              )[0] +
              mMatrix[seriesNode.rightChild.index].get(
                nodesRL[k] + '_' + nodesRR[w]
              )[0] +
              distanceMatrix[nodesLR[m]][nodesRL[k]];
            if (cur < curMin) {
              curMin = cur;
              let curOrder = mMatrix[seriesNode.leftChild.index]
                .get(nodesLL[u] + '_' + nodesLR[m])[1]
                .concat(
                  mMatrix[seriesNode.rightChild.index].get(
                    nodesRL[k] + '_' + nodesRR[w]
                  )[1]
                );
              mMatrix[seriesNode.index].set(nodesLL[u] + '_' + nodesRR[w], [
                cur,
                curOrder,
              ]);
              mMatrix[seriesNode.index].set(nodesRR[w] + '_' + nodesLL[u], [
                cur,
                curOrder.slice().reverse(),
              ]);
            }
          }
        }
      }
    }
  }

  return mMatrix;
}

function getAllLeavesInternalNode(seriesNode) {
  if (seriesNode.leave) {
    return [seriesNode.index];
  }
  return getAllLeavesInternalNode(seriesNode.leftChild).concat(
    getAllLeavesInternalNode(seriesNode.rightChild)
  );
}
