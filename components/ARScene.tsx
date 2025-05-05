import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

// Update fallback models with more diverse options
const fallbackModels = {
  'cube': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF/Box.gltf',
  'fish': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf', // Using duck as temporary fish
  'dragon': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Dragon/glTF/Dragon.gltf',
  'robot': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/glTF/BrainStem.gltf',
  'lantern': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Lantern/glTF/Lantern.gltf',
  'animal': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF/Fox.gltf',
  'human': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Soldier/glTF/Soldier.gltf',
  'vehicle': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMilkTruck/glTF/CesiumMilkTruck.gltf',
  'default': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF/Box.gltf'
};

interface ARSceneProps {
  modelUrl: string;
}

const ARScene: React.FC<ARSceneProps> = ({ modelUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const reticleRef = useRef<THREE.Mesh | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const hitTestSourceRef = useRef<XRHitTestSource | null>(null);
  const hitTestSourceRequiredRef = useRef<boolean>(false);
  const sessionRef = useRef<XRSession | null>(null);
  const [isXRSupported, setIsXRSupported] = useState<boolean | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [placedObjects, setPlacedObjects] = useState<THREE.Object3D[]>([]);

  useEffect(() => {
    // Reset states when model URL changes
    setModelLoaded(false);
    setModelLoadProgress(0);
    setModelLoadError(null);
    
    // Check if WebXR is supported
    if (typeof navigator !== 'undefined') {
      if (!('xr' in navigator)) {
        setIsXRSupported(false);
        return;
      }
      
      // Check if AR is supported
      navigator.xr?.isSessionSupported('immersive-ar')
        .then(supported => {
          setIsXRSupported(supported);
          if (!supported) {
            console.log('WebXR AR not supported on this device/browser');
          }
        })
        .catch(err => {
          console.error('Error checking AR support:', err);
          setIsXRSupported(false);
        });
    }

    if (!containerRef.current) return;

    // Initialize scene, camera, and renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    camera.position.set(0, 1.6, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add hemisphere light for better ambient lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    scene.add(hemisphereLight);

    // Create reticle for AR placement with improved visibility
    const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const reticleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
    reticleRef.current = reticle;

    // Add AR button to the container only if WebXR is supported
    if (isXRSupported) {
      try {
        const arButton = ARButton.createButton(renderer, {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: document.body },
        });
        
        // Style the AR button
        arButton.style.position = 'fixed';
        arButton.style.bottom = '20px';
        arButton.style.left = '50%';
        arButton.style.transform = 'translateX(-50%)';
        arButton.style.zIndex = '2000';
        arButton.style.padding = '12px 24px';
        arButton.style.borderRadius = '8px';
        arButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        arButton.style.color = 'white';
        arButton.style.border = 'none';
        arButton.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        arButton.style.fontSize = '14px';
        arButton.style.cursor = 'pointer';
        arButton.style.transition = 'background-color 0.3s ease';

        // Change button text
        const updateButtonText = () => {
          if (arButton.textContent?.includes('Start')) {
            arButton.textContent = 'Start AR';
          } else if (arButton.textContent?.includes('Stop')) {
            arButton.textContent = 'Stop AR';
          }
        };
        updateButtonText();
        
        // Add hover effect
        arButton.addEventListener('mouseover', () => {
          arButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        });
        arButton.addEventListener('mouseout', () => {
          arButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        });

        document.body.appendChild(arButton);
      } catch (error) {
        console.error("Error creating AR button:", error);
        setIsXRSupported(false);
      }
    }

    // Handle XR session
    renderer.xr.addEventListener('sessionstart', () => {
      sessionRef.current = renderer.xr.getSession();
      hitTestSourceRequiredRef.current = true;
      console.log("AR session started");
    });

    renderer.xr.addEventListener('sessionend', () => {
      console.log("AR session ended");
      sessionRef.current = null;
      hitTestSourceRef.current = null;
      hitTestSourceRequiredRef.current = false;
    });

    // Handle controller for selecting placement
    const controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    // Load 3D model with improved quality
    const loadModel = (url: string) => {
      // Clear any previous model
      if (modelRef.current) {
        scene.remove(modelRef.current);
        modelRef.current = null;
      }
      
      setModelLoaded(false);
      setModelLoadProgress(0);
      setModelLoadError(null);
      
      console.log('Starting to load model from URL:', url);
      
      const loader = new GLTFLoader();
      
      // Add timeout for model loading
      const timeoutId = setTimeout(() => {
        console.error('Model loading timed out');
        setModelLoadError('Model loading timed out. Please try again.');
        if (url !== fallbackModels.cube) {
          console.log('Attempting to load fallback model...');
          loadModel(fallbackModels.cube);
        }
      }, 30000);
      
      loader.load(
        url,
        (gltf) => {
          clearTimeout(timeoutId);
          console.log('GLTF loaded successfully:', gltf);
          const model = gltf.scene;
          
          // Enhanced model setup
          model.scale.set(0.3, 0.3, 0.3); // Smaller scale for better visibility
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.material) {
                // Enhanced material settings
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach(mat => {
                    if (mat instanceof THREE.MeshStandardMaterial) {
                      mat.roughness = 0.5;
                      mat.metalness = 0.5;
                    }
                    if (mat.transparent) {
                      mat.opacity = 1.0;
                      mat.transparent = true;
                    }
                  });
                } else {
                  if (mesh.material instanceof THREE.MeshStandardMaterial) {
                    mesh.material.roughness = 0.5;
                    mesh.material.metalness = 0.5;
                  }
                  if (mesh.material.transparent) {
                    mesh.material.opacity = 1.0;
                    mesh.material.transparent = true;
                  }
                }
              }
            }
          });
          
          // For non-AR fallback view
          if (!isXRSupported) {
            model.position.set(0, 0, -2);
            model.visible = true;
          } else {
            model.visible = false;
          }
          
          scene.add(model);
          modelRef.current = model;
          setModelLoaded(true);
          setModelLoadProgress(100);
          console.log('Model loaded and added to scene successfully');
        },
        (progress) => {
          if (progress.lengthComputable) {
            const progressPercent = Math.round((progress.loaded / progress.total) * 100);
            setModelLoadProgress(progressPercent);
            console.log(`Loading model: ${progressPercent}%`);
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error('Error loading model:', error);
          setModelLoadError(`Failed to load 3D model: ${error instanceof Error ? error.message : String(error)}`);
          if (url !== fallbackModels.cube) {
            console.log('Attempting to load fallback model...');
            loadModel(fallbackModels.cube);
          }
        }
      );
    };

    if (modelUrl) {
      console.log('Loading model with URL:', modelUrl);
      // Add a small delay before loading to ensure scene is ready
      setTimeout(() => {
        loadModel(modelUrl);
      }, 100);
    }

    // Handle placement of model
    function onSelect() {
      if (reticleRef.current?.visible && modelRef.current) {
        const model = modelRef.current.clone();
        model.position.setFromMatrixPosition(reticleRef.current.matrix);
        model.visible = true;
        scene.add(model);
        setPlacedObjects(prev => [...prev, model]);
        
        // Add a small animation to indicate successful placement
        const origScale = { ...model.scale };
        model.scale.set(origScale.x * 1.2, origScale.y * 1.2, origScale.z * 1.2);
        
        setTimeout(() => {
          // Animate back to original scale
          const duration = 300; // ms
          const startTime = Date.now();
          
          function animateScale() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const newScale = {
              x: origScale.x * (1.2 - (0.2 * progress)),
              y: origScale.y * (1.2 - (0.2 * progress)),
              z: origScale.z * (1.2 - (0.2 * progress))
            };
            
            model.scale.set(newScale.x, newScale.y, newScale.z);
            
            if (progress < 1) {
              requestAnimationFrame(animateScale);
            }
          }
          
          animateScale();
        }, 100);
      }
    }

    // Animation loop
    function animate() {
      renderer.setAnimationLoop(render);
    }

    function render(timestamp: number, frame: XRFrame | undefined) {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (referenceSpace && session) {
          if (hitTestSourceRequiredRef.current) {
            // Create a separate variable to satisfy TypeScript
            const xrSession: XRSession = session;
            xrSession.requestReferenceSpace('viewer').then((viewerSpace) => {
              // Use non-null assertion to tell TypeScript the method exists
              xrSession.requestHitTestSource!({ space: viewerSpace })
                .then((source) => {
                  hitTestSourceRef.current = source;
                })
                .catch(err => {
                  console.error("Error requesting hit test source:", err);
                });
            });
            hitTestSourceRequiredRef.current = false;
          }

          if (hitTestSourceRef.current) {
            const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
            if (hitTestResults.length > 0) {
              const hit = hitTestResults[0];
              const pose = hit.getPose(referenceSpace);

              if (pose && reticleRef.current) {
                reticleRef.current.visible = true;
                reticleRef.current.matrix.fromArray(pose.transform.matrix);
              }
            }
          }
        }
      } else if (modelRef.current && !isXRSupported) {
        // For non-AR fallback, rotate the model to make it more interactive
        modelRef.current.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null);
        if (containerRef.current) {
          try {
            // Check if the element is actually a child before removing
            if (rendererRef.current.domElement.parentNode === containerRef.current) {
              containerRef.current.removeChild(rendererRef.current.domElement);
            }
          } catch (error) {
            console.error("Error removing renderer element:", error);
          }
        }
      }

      const arButton = document.querySelector('button[data-type="ar"]');
      if (arButton && arButton.parentNode) {
        try {
          arButton.remove();
        } catch (error) {
          console.error("Error removing AR button:", error);
        }
      }

      if (hitTestSourceRef.current) {
        try {
          hitTestSourceRef.current.cancel();
        } catch (error) {
          console.error("Error cancelling hit test source:", error);
        }
        hitTestSourceRef.current = null;
      }
    };
  }, [modelUrl, isXRSupported]);

  if (isXRSupported === false) {
    return (
      <div className="w-full">
        <div ref={containerRef} className="ar-container w-full h-64 bg-slate-100 rounded-md relative" />
        {modelLoadError ? (
          <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            <h3 className="font-medium">Error Loading Model</h3>
            <p className="text-sm mt-1">{modelLoadError}</p>
          </div>
        ) : !modelLoaded ? (
          <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-700">Loading 3D Model...</span>
              <span className="text-xs text-blue-500">{modelLoadProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${modelLoadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
            <h3 className="font-medium">WebXR Not Supported</h3>
            <p className="text-sm mt-1">
              Your device or browser doesn't support AR. Showing a non-AR 3D preview instead.
            </p>
            <ul className="text-sm list-disc pl-5 mt-1">
              <li>Use an Android device with Chrome browser</li>
              <li>Access this site over HTTPS or localhost</li>
              <li>Ensure WebXR is enabled in your browser</li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0" style={{ background: 'transparent' }}>
      <div 
        ref={containerRef} 
        className="w-full h-full"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'transparent'
        }} 
      />
      
      {modelLoadError ? (
        <div className="fixed bottom-24 left-4 right-4 mx-auto max-w-md p-3 bg-black/70 backdrop-blur-sm rounded-lg text-white text-sm">
          {modelLoadError}
        </div>
      ) : !modelLoaded ? (
        <div className="fixed bottom-24 left-4 right-4 mx-auto max-w-md p-3 bg-black/70 backdrop-blur-sm rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-white">Loading Model...</span>
            <span className="text-xs text-white/80">{modelLoadProgress}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-1">
            <div 
              className="bg-white rounded-full h-1 transition-all duration-300"
              style={{ width: `${modelLoadProgress}%` }}
            ></div>
          </div>
        </div>
      ) : placedObjects.length > 0 ? (
        <div className="absolute top-4 right-4 p-2 bg-white/70 backdrop-blur-sm rounded-md text-xs text-slate-700">
          {placedObjects.length} {placedObjects.length === 1 ? 'model' : 'models'} placed
        </div>
      ) : null}
    </div>
  );
};

// Add some CSS to ensure proper rendering
const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'transparent',
    zIndex: 1
  }
} as const;

export default dynamic(() => Promise.resolve(ARScene), { ssr: false }); 