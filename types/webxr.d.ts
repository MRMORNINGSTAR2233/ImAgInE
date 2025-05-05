interface XRHitTestSource {
  cancel(): void;
}

interface XRHitTestResult {
  getPose(baseSpace: XRReferenceSpace): XRPose | null;
}

interface XRFrame {
  getHitTestResults(hitTestSource: XRHitTestSource): XRHitTestResult[];
  getPose(space: XRReferenceSpace, baseSpace: XRReferenceSpace): XRPose | null;
}

interface XRPose {
  transform: {
    matrix: Float32Array;
    position: any;
    orientation: any;
  };
}

interface XRReferenceSpace {
  getOffsetReferenceSpace(offsetTransform: XRRigidTransform): XRReferenceSpace;
}

interface XRSession {
  requestReferenceSpace(type: string): Promise<XRReferenceSpace>;
  requestHitTestSource(options: { space: XRReferenceSpace }): Promise<XRHitTestSource>;
  end(): Promise<void>;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}

declare namespace THREE {
  interface WebGLRenderer {
    xr: {
      enabled: boolean;
      getController(index: number): THREE.Group;
      getSession(): XRSession | null;
      setReferenceSpaceType(type: string): void;
      getReferenceSpace(): XRReferenceSpace | null;
      getFrame(): XRFrame | null;
      setAnimationLoop(callback: ((timestamp: number, frame?: XRFrame) => void) | null): void;
      isPresenting: boolean;
      addEventListener(type: string, listener: (event: any) => void): void;
      removeEventListener(type: string, listener: (event: any) => void): void;
    };
  }
} 