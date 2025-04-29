import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

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

  useEffect(() => {
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
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Light setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create reticle for AR placement
    const reticleGeometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const reticleMaterial = new THREE.MeshBasicMaterial();
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
        document.body.appendChild(arButton);
      } catch (error) {
        console.error("Error creating AR button:", error);
        setIsXRSupported(false);
      }
    }

    // Handle XR session
    renderer.xr.addEventListener('sessionstart', () => {
      sessionRef.current = renderer.xr.getSession();
    });

    renderer.xr.addEventListener('sessionend', () => {
      sessionRef.current = null;
      hitTestSourceRef.current = null;
      hitTestSourceRequiredRef.current = false;
    });

    // Handle controller for selecting placement
    const controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    // Load 3D model
    const loadModel = (url: string) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
          
          // For non-AR fallback view, make the model visible directly
          if (!isXRSupported) {
            model.position.set(0, 0, -2);
            model.visible = true;
          } else {
            model.visible = false;
          }
          
          scene.add(model);
          modelRef.current = model;
          setModelLoaded(true);
          console.log('Model loaded successfully');
        },
        (progress) => {
          console.log(`Loading model: ${(progress.loaded / progress.total) * 100}%`);
        },
        (error) => {
          console.error('Error loading model:', error);
        }
      );
    };

    loadModel(modelUrl);

    // Handle placement of model
    function onSelect() {
      if (reticleRef.current?.visible && modelRef.current) {
        const model = modelRef.current.clone();
        model.position.setFromMatrixPosition(reticleRef.current.matrix);
        model.visible = true;
        scene.add(model);
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
            session.requestReferenceSpace('viewer').then((referenceSpace) => {
              session.requestHitTestSource({ space: referenceSpace })
                .then((source) => {
                  hitTestSourceRef.current = source;
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
        <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
          <h3 className="font-medium">WebXR Not Supported</h3>
          <p className="text-sm mt-1">
            Your device or browser doesn't support AR. For the best experience:
          </p>
          <ul className="text-sm list-disc pl-5 mt-1">
            <li>Use an Android device with Chrome browser</li>
            <li>Access this site over HTTPS or localhost</li>
            <li>Ensure WebXR is enabled in your browser</li>
          </ul>
          {modelLoaded && (
            <p className="text-sm mt-2">
              A non-AR 3D preview is shown above.
            </p>
          )}
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="ar-container w-full h-screen absolute top-0 left-0 z-10" />;
};

export default dynamic(() => Promise.resolve(ARScene), { ssr: false }); 