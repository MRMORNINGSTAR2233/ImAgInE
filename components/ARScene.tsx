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
  onArSessionChange?: (active: boolean) => void;
}

const ARScene: React.FC<ARSceneProps> = ({ modelUrl, onArSessionChange }) => {
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
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        // Create custom AR button handler
        const handleARButtonClick = () => {
          if (sessionRef.current) {
            // Stop the session
            sessionRef.current.end();
          } else {
            // Start a new session
            renderer.xr.setReferenceSpaceType('local');
            renderer.xr.setSession(null);
            
            navigator.xr?.requestSession('immersive-ar', {
              requiredFeatures: ['hit-test'],
              optionalFeatures: ['dom-overlay'],
              domOverlay: { root: document.body }
            }).then((session) => {
              renderer.xr.setSession(session);
              if (onArSessionChange) {
                onArSessionChange(true);
                setIsFullscreen(true);
              }
            }).catch(error => {
              console.error('Error starting AR session:', error);
            });
          }
        };

        // Create a custom button instead of using ARButton.createButton
        const customARButton = document.createElement('button');
        customARButton.textContent = 'Start AR';
        customARButton.style.position = 'fixed';
        customARButton.style.bottom = '20px';
        customARButton.style.left = '50%';
        customARButton.style.transform = 'translateX(-50%)';
        customARButton.style.zIndex = '2000';
        customARButton.style.padding = '12px 24px';
        customARButton.style.borderRadius = '8px';
        customARButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        customARButton.style.color = 'white';
        customARButton.style.border = 'none';
        customARButton.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        customARButton.style.fontSize = '14px';
        customARButton.style.cursor = 'pointer';
        
        customARButton.addEventListener('click', handleARButtonClick);
        document.body.appendChild(customARButton);
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
      if (onArSessionChange) {
        onArSessionChange(true);
        setIsFullscreen(true);
      }
    });

    renderer.xr.addEventListener('sessionend', () => {
      console.log("AR session ended");
      sessionRef.current = null;
      hitTestSourceRef.current = null;
      hitTestSourceRequiredRef.current = false;
      if (onArSessionChange) {
        onArSessionChange(false);
        setIsFullscreen(false);
      }
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
      
      // Check if URL is valid
      if (!url || url === 'undefined') {
        console.error('Invalid model URL:', url);
        setModelLoadError('Invalid model URL. Please try again.');
        loadModel(fallbackModels.default);
        return;
      }
      
      const loader = new GLTFLoader();
      
      // Add timeout for model loading
      const timeoutId = setTimeout(() => {
        console.error('Model loading timed out');
        setModelLoadError('Model loading timed out. Please try again.');
        if (url !== fallbackModels.default) {
          console.log('Attempting to load fallback model...');
          loadModel(fallbackModels.default);
        }
      }, 30000);
      
      // Add load manager for better error handling
      const manager = new THREE.LoadingManager();
      manager.onError = (url) => {
        console.error('Error loading resource:', url);
        clearTimeout(timeoutId);
        setModelLoadError(`Failed to load resource: ${url}`);
        if (url !== fallbackModels.default) {
          loadModel(fallbackModels.default);
        }
      };
      
      loader.setPath(url.substring(0, url.lastIndexOf('/') + 1));
      loader.manager = manager;
      
      loader.load(
        url.split('/').pop() || url, // Get filename only if path was set
        (gltf) => {
          clearTimeout(timeoutId);
          console.log('GLTF loaded successfully:', gltf);
          const model = gltf.scene;
          
          // Scale based on model type
          const getAppropriateScale = () => {
            if (url.includes('Dragon')) return 0.05;
            if (url.includes('Lantern')) return 0.5;
            if (url.includes('Duck')) return 0.2;
            if (url.includes('Truck')) return 0.2;
            if (url.includes('Soldier')) return 0.1;
            if (url.includes('Fox')) return 0.05;
            return 0.2; // Default scale
          };
          
          const scale = getAppropriateScale();
          model.scale.set(scale, scale, scale);
          
          // Center model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center); // Center the model at origin
          
          // Enhance materials
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              
              // Add shadows
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              
              if (mesh.material) {
                // Enhanced material settings
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach(mat => {
                    if (mat instanceof THREE.MeshStandardMaterial) {
                      mat.roughness = 0.7;
                      mat.metalness = 0.3;
                      mat.envMapIntensity = 1.0;
                    }
                    if (mat.transparent) {
                      mat.opacity = 1.0;
                      mat.transparent = true;
                    }
                  });
                } else {
                  if (mesh.material instanceof THREE.MeshStandardMaterial) {
                    mesh.material.roughness = 0.7;
                    mesh.material.metalness = 0.3;
                    mesh.material.envMapIntensity = 1.0;
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
          if (url !== fallbackModels.default) {
            console.log('Attempting to load fallback model...');
            loadModel(fallbackModels.default);
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
        // Create a clone of the model
        const model = modelRef.current.clone();
        
        // Position at reticle
        model.position.setFromMatrixPosition(reticleRef.current.matrix);
        
        // Make sure it's visible
        model.visible = true;
        
        // Add a small visual feedback animation when placing
        const originalScale = model.scale.clone();
        model.scale.multiplyScalar(1.2); // Slightly larger
        
        // Animate back to normal size
        const duration = 300; // ms
        const startTime = performance.now();
        
        function animateScale(time: number) {
          const elapsed = time - startTime;
          if (elapsed < duration) {
            const progress = elapsed / duration;
            const scale = 1.2 - (0.2 * progress);
            model.scale.copy(originalScale).multiplyScalar(scale);
            requestAnimationFrame(animateScale);
          } else {
            model.scale.copy(originalScale);
          }
        }
        
        requestAnimationFrame(animateScale);
        
        // Add to scene
        scene.add(model);
        setPlacedObjects(prev => [...prev, model]);
        
        // Optional: Add a simple animation to the placed model
        const angle = Math.random() * Math.PI * 2; // Random rotation
        const animate = () => {
          model.rotation.y += 0.005;
          requestAnimationFrame(animate);
        };
        
        // Uncomment to add rotation animation
        // animate();
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

      const arButton = document.querySelector('button');
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
      
      // Reset fullscreen state when component unmounts
      if (onArSessionChange && isFullscreen) {
        onArSessionChange(false);
      }
    };
  }, [modelUrl, isXRSupported, onArSessionChange, isFullscreen]);

  // Simplified fullscreen AR view
  if (isFullscreen) {
    return (
      <div className="fixed inset-0" style={{ background: 'transparent', zIndex: 9999 }}>
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
        
        {!modelLoaded && (
          <div className="fixed bottom-24 left-0 right-0 mx-auto max-w-[200px] p-2 bg-black/50 rounded-full text-center">
            <span className="text-sm text-white">Loading {modelLoadProgress}%</span>
          </div>
        )}
      </div>
    );
  }

  if (isXRSupported === false) {
    return (
      <div className="w-full">
        <div ref={containerRef} className="w-full h-64 bg-slate-100 rounded-md relative" />
        {modelLoadError ? (
          <div className="mt-2 p-3 bg-black/70 text-white rounded-md text-sm">
            {modelLoadError}
          </div>
        ) : !modelLoaded ? (
          <div className="mt-2 p-3 bg-black/70 text-white rounded-md">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Loading Model...</span>
              <span className="text-xs opacity-80">{modelLoadProgress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1">
              <div 
                className="bg-white rounded-full h-1 transition-all duration-300"
                style={{ width: `${modelLoadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <div className="mt-2 p-3 bg-black/70 text-white rounded-md text-sm">
            <p>WebXR not supported on this device/browser. Showing fallback view.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-64">
      <div ref={containerRef} className="w-full h-full" />
      
      {modelLoadError ? (
        <div className="absolute bottom-4 left-4 right-4 mx-auto max-w-md p-2 bg-black/70 rounded-lg text-white text-sm">
          {modelLoadError}
        </div>
      ) : !modelLoaded ? (
        <div className="absolute bottom-4 left-4 right-4 mx-auto max-w-md p-2 bg-black/70 rounded-lg">
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
      ) : null}
    </div>
  );
};

export default dynamic(() => Promise.resolve(ARScene), { ssr: false }); 