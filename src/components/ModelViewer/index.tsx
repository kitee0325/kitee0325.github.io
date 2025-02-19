import React, { useEffect, useState, Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface ModelViewerProps {
  modelPath: string;
  texturePath?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  rotationSpeed?: number;
  ambientLightIntensity?: number;
  directionalLightIntensity?: number;
  spotLightIntensity?: number;
}

const Model: React.FC<{
  modelPath: string;
  texturePath?: string;
  rotationSpeed?: number;
}> = ({ modelPath, texturePath, rotationSpeed = 0.005 }) => {
  const { scene } = useGLTF(modelPath);
  const [texturedScene, setTexturedScene] = useState(scene);
  const modelRef = useRef<THREE.Group>();
  const { camera } = useThree();

  useEffect(() => {
    if (texturePath) {
      const texture = new THREE.TextureLoader().load(texturePath);
      scene.traverse((child) => {
        if ('isMesh' in child && 'material' in child) {
          const mesh = child as THREE.Mesh;
          if (
            mesh.material instanceof THREE.MeshStandardMaterial ||
            mesh.material instanceof THREE.MeshBasicMaterial
          ) {
            mesh.material.map = texture;
          }
        }
      });
      setTexturedScene(scene.clone());
    }

    // Center and scale the model
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    let cameraZ: number;
    if ('fov' in camera) {
      const fov = camera.fov * (Math.PI / 180);
      cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    } else {
      cameraZ = maxDim;
    }

    cameraZ *= 2; // Increase this multiplier to move the camera further back

    camera.position.set(0, 0, cameraZ);
    camera.updateProjectionMatrix();

    const centeredGroup = new THREE.Group();
    centeredGroup.add(scene);
    scene.position.set(-center.x, -center.y, -center.z);

    setTexturedScene(centeredGroup);
  }, [scene, texturePath, camera]);

  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.rotation.y += rotationSpeed;
    }
  });

  return <primitive ref={modelRef} object={texturedScene} />;
};

const ModelViewer: React.FC<ModelViewerProps> = ({
  modelPath,
  texturePath,
  canvasWidth = 800,
  canvasHeight = 600,
  rotationSpeed,
  ambientLightIntensity = 0.3,
  directionalLightIntensity = 1,
  spotLightIntensity = 0.5,
}) => {
  return (
    <Canvas style={{ width: canvasWidth, height: canvasHeight }}>
      <ambientLight intensity={ambientLightIntensity} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={directionalLightIntensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        intensity={spotLightIntensity}
        castShadow
      />
      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <Suspense fallback={null}>
        <Model
          modelPath={modelPath}
          texturePath={texturePath}
          rotationSpeed={rotationSpeed}
        />
      </Suspense>
    </Canvas>
  );
};

export default ModelViewer;
