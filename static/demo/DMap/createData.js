function generateHalfNormalRandom() {
  // Box-Muller transform to generate normal distribution
  let u1 = Math.random();
  let u2 = Math.random();

  // Generate standard normal random number using Box-Muller
  let z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Take absolute value to get half-normal distribution
  z = Math.abs(z);

  // Scale to 0-1 range (most values will be near 0)
  // Using error function approximation to normalize
  let result = 1 - Math.exp((-z * z) / 2);

  // Ensure result is between 0 and 1
  return Math.min(Math.max(result, 0), 1);
}

function generateRandomTimes(startTime, count) {
  // Convert start time to timestamp
  const start = new Date(startTime).getTime();
  // 3 days = 72 hours = 259200000 milliseconds
  const timeRange = 259200000;
  const times = [];

  // First generate 4 times for root node's children
  for (let i = 0; i < 4; i++) {
    const randomOffset = Math.floor(Math.random() * (timeRange / 4)); // First quarter of time range
    const timestamp = start + randomOffset;
    times.push(new Date(timestamp));
  }

  // Generate remaining times
  for (let i = 4; i < count; i++) {
    const randomOffset = Math.floor(Math.random() * timeRange);
    const timestamp = start + randomOffset;
    times.push(new Date(timestamp));
  }

  // Sort chronologically
  times.sort((a, b) => a - b);

  return times;
}

function generateTree(totalNodes, baseChildCount) {
  let remainingNodes = totalNodes - 1; // -1 for root node
  const nodes = [];
  const edges = [];

  // Create root node
  nodes.push({ id: 0, isRoot: true });

  // Queue for processing nodes that can still have children
  const queue = [0];
  let currentId = 1;

  while (remainingNodes > 0) {
    // If queue is empty but we still have nodes to allocate,
    // take the last created node and add it to queue
    if (queue.length === 0) {
      queue.push(currentId - 1);
    }

    const parentId = queue.shift();

    // Calculate how many nodes we should allocate here
    let maxPossibleChildren = Math.min(
      Math.floor(generateHalfNormalRandom() * baseChildCount),
      remainingNodes
    );

    // If we're running out of nodes to distribute, force allocation
    let childCount;
    if (queue.length === 0 && remainingNodes <= baseChildCount) {
      // If this is the last parent and we still have nodes, use all remaining
      childCount = remainingNodes;
    } else {
      // Otherwise use the calculated amount
      childCount = maxPossibleChildren;
    }

    // Create children
    for (let i = 0; i < childCount; i++) {
      nodes.push({ id: currentId });
      edges.push({ source: parentId, target: currentId });
      queue.push(currentId);
      currentId++;
      remainingNodes--;
    }
  }

  return { nodes, edges };
}

function main() {
  const { nodes, edges } = generateTree(500, 50);
  const times = generateRandomTimes(new Date(), 500);

  // step1: add time
  // Assign times to nodes in order of tree traversal
  // This ensures parent nodes always have earlier times than children
  nodes.forEach((node, index) => {
    node.time = times[index];
  });

  // step2: add category
  // Create a map of node id to category
  const nodeCategories = new Map();

  // Find root node (node with no incoming edges)
  const hasIncomingEdge = new Set(edges.map((e) => e.target));
  const rootId = nodes.find((n) => !hasIncomingEdge.has(n.id)).id;

  // Get all first level nodes (direct children of root)
  const firstLevelNodes = edges
    .filter((e) => e.source === rootId)
    .map((e) => e.target);

  // Assign categories A-Z to first level nodes
  firstLevelNodes.forEach((nodeId, index) => {
    // Convert index to letter (A=65, B=66, etc)
    const category = String.fromCharCode(65 + (index % 26));
    nodeCategories.set(nodeId, category);
  });

  // Process remaining nodes in breadth-first order
  const queue = [...firstLevelNodes];
  while (queue.length > 0) {
    const parentId = queue.shift();
    const parentCategory = nodeCategories.get(parentId);

    // Get children of current node
    const children = edges
      .filter((e) => e.source === parentId)
      .map((e) => e.target);

    // Process each child
    children.forEach((childId) => {
      // 90% chance to inherit parent's category
      if (Math.random() < 0.9) {
        nodeCategories.set(childId, parentCategory);
      } else {
        // 10% chance to get random existing category
        const existingCategories = Array.from(nodeCategories.values());
        const randomCategory =
          existingCategories[
            Math.floor(Math.random() * existingCategories.length)
          ];
        nodeCategories.set(childId, randomCategory);
      }
      queue.push(childId);
    });
  }

  // Add categories to nodes
  nodes.forEach((node) => {
    node.category = nodeCategories.get(node.id);
  });

  // step3: add links
  // Add links between siblings based on time order
  const nodesByParent = new Map();

  // Group nodes by their parent
  edges.forEach((edge) => {
    if (!nodesByParent.has(edge.source)) {
      nodesByParent.set(edge.source, []);
    }
    nodesByParent.get(edge.source).push({
      id: edge.target,
      time: nodes.find((n) => n.id === edge.target).time,
    });
  });

  // For each parent's children, create edges based on time order
  nodesByParent.forEach((children) => {
    if (children.length > 1) {
      // Sort children by time
      children.sort((a, b) => a.time - b.time);

      // Create edges between consecutive nodes
      for (let i = 0; i < children.length - 1; i++) {
        edges.push({
          source: children[i].id,
          target: children[i + 1].id,
        });
      }
    }
  });

  return { nodes, edges };
}
