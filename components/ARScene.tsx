import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import styles from './ARScene.module.css';

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
        // Use the built-in ARButton that's known to work reliably
        const arButton = ARButton.createButton(renderer, {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: document.body }
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
        
        // Simplify button text
        const observer = new MutationObserver(() => {
          if (arButton.textContent?.includes('START')) {
            arButton.textContent = 'Start AR';
          } else if (arButton.textContent?.includes('STOP')) {
            arButton.textContent = 'Stop AR';
          }
        });
        
        observer.observe(arButton, { childList: true, characterData: true, subtree: true });
        
        document.body.appendChild(arButton);
        console.log('AR button created and added to document');
      } catch (error) {
        console.error("Error creating AR button:", error);
        setIsXRSupported(false);
      }
    }

    // Handle XR session
    renderer.xr.addEventListener('sessionstart', () => {
      console.log("AR session started");
      sessionRef.current = renderer.xr.getSession();
      hitTestSourceRequiredRef.current = true;
      
      if (onArSessionChange) {
        onArSessionChange(true);
        setIsFullscreen(true);
      }
      
      // Ensure model visibility in AR mode
      if (modelRef.current) {
        modelRef.current.visible = false; // Hide original model
      }
    });

    renderer.xr.addEventListener('sessionend', () => {
      console.log("AR session ended");
      if (onArSessionChange) {
        onArSessionChange(false);
        setIsFullscreen(false);
      }
      
      sessionRef.current = null;
      hitTestSourceRef.current = null;
      hitTestSourceRequiredRef.current = false;
      
      // Optional: clean up placed objects when session ends
      // placedObjects.forEach(obj => scene.remove(obj));
      // setPlacedObjects([]);
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
      
      // Don't use setPath as it can cause issues with some URLs
      try {
        loader.load(
          url,
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
            center.y = 0; // Only center horizontally, keep vertical position
            model.position.sub(center);
            
            // Add model to scene
            scene.add(model);
            modelRef.current = model;
            
            // Set visibility based on current mode
            if (!isXRSupported) {
              // For non-AR fallback view
              model.position.set(0, 0, -2);
              model.visible = true;
            } else if (sessionRef.current) {
              // If already in AR session, hide the model until placed
              model.visible = false;
            } else {
              // If not in AR yet, show it in the preview
              model.position.set(0, 0, -2);
              model.visible = true;
            }
            
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
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error initializing model load:', error);
        setModelLoadError(`Error initializing model load: ${error instanceof Error ? error.message : String(error)}`);
        if (url !== fallbackModels.default) {
          loadModel(fallbackModels.default);
        }
      }
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
        console.log('Placing model at reticle position');
        // Create a clone of the model
        const model = modelRef.current.clone();
        
        // Position at reticle
        model.position.setFromMatrixPosition(reticleRef.current.matrix);
        
        // Make sure it's visible
        model.visible = true;
        
        // Add to scene
        scene.add(model);
        setPlacedObjects(prev => [...prev, model]);
        console.log('Model placed successfully');
      } else {
        console.log('Cannot place model - reticle not visible or model not loaded');
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
            console.log('Requesting hit test source...');
            const xrSession: XRSession = session;
            
            xrSession.requestReferenceSpace('viewer')
              .then((viewerSpace) => {
                console.log('Viewer space acquired');
                if (xrSession.requestHitTestSource) {
                  return xrSession.requestHitTestSource({ space: viewerSpace });
                } else {
                  console.error('Hit test source not available');
                  return null;
                }
              })
              .then((source) => {
                if (source) {
                  console.log('Hit test source created');
                  hitTestSourceRef.current = source;
                }
              })
              .catch(err => {
                console.error("Error setting up hit test:", err);
              });
              
            hitTestSourceRequiredRef.current = false;
          }

          if (hitTestSourceRef.current) {
            try {
              const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
              
              if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);

                if (pose && reticleRef.current) {
                  reticleRef.current.visible = true;
                  reticleRef.current.matrix.fromArray(pose.transform.matrix);
                }
              } else {
                // No hit test results - hide reticle
                if (reticleRef.current) {
                  reticleRef.current.visible = false;
                }
              }
            } catch (error) {
              console.error('Error in hit test:', error);
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
        console.log('Cleaning up renderer');
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

      // Remove AR button
      const arButton = document.querySelector('button');
      if (arButton && arButton.parentNode) {
        console.log('Removing AR button');
        try {
          arButton.remove();
        } catch (error) {
          console.error("Error removing AR button:", error);
        }
      }

      // Clean up hit test source
      if (hitTestSourceRef.current) {
        console.log('Cancelling hit test source');
        try {
          hitTestSourceRef.current.cancel();
        } catch (error) {
          console.error("Error cancelling hit test source:", error);
        }
        hitTestSourceRef.current = null;
      }
      
      // End any active XR session
      if (sessionRef.current) {
        console.log('Ending XR session');
        try {
          sessionRef.current.end();
        } catch (error) {
          console.error("Error ending XR session:", error);
        }
      }
      
      // Reset fullscreen state when component unmounts
      if (onArSessionChange && isFullscreen) {
        onArSessionChange(false);
      }
    };
  }, [modelUrl, isXRSupported, onArSessionChange, isFullscreen]);

  function getProgressBarWidthClass(progress: number): string {
    const roundedProgress = Math.floor(progress / 10) * 10;
    return styles[`w${roundedProgress}`];
  }

  // Simplified fullscreen AR view
  if (isFullscreen) {
    return (
      <div className={styles.fullscreenContainer}>
        <div 
          ref={containerRef} 
          className={styles.container}
        />
        
        {!modelLoaded && (
          <div className={styles.loadingIndicator}>
            <span className={styles.loadingText}>Loading {modelLoadProgress}%</span>
          </div>
        )}
      </div>
    );
  }

  if (isXRSupported === false) {
    return (
      <div className="w-full">
        <div ref={containerRef} className={styles.fallbackContainer} />
        {modelLoadError ? (
          <div className={styles.fallbackMessage}>
            {modelLoadError}
          </div>
        ) : !modelLoaded ? (
          <div className={styles.fallbackMessage}>
            <div className={styles.progressText}>
              <span className={styles.progressLabel}>Loading Model...</span>
              <span className={styles.progressPercent}>{modelLoadProgress}%</span>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={`${styles.progressFill} ${getProgressBarWidthClass(modelLoadProgress)}`}
              ></div>
            </div>
          </div>
        ) : (
          <div className={styles.fallbackMessage}>
            <p>WebXR not supported on this device/browser. Showing fallback view.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-64">
      <div ref={containerRef} className={styles.arPreviewContainer} />
      
      {modelLoadError ? (
        <div className={styles.errorMessage}>
          {modelLoadError}
        </div>
      ) : !modelLoaded ? (
        <div className={styles.progressContainer}>
          <div className={styles.progressText}>
            <span className={styles.progressLabel}>Loading Model...</span>
            <span className={styles.progressPercent}>{modelLoadProgress}%</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={`${styles.progressFill} ${getProgressBarWidthClass(modelLoadProgress)}`}
            ></div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default dynamic(() => Promise.resolve(ARScene), { ssr: false }); 