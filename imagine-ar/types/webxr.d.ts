interface XRHitTestSource {
  cancel(): void;
}

interface XRHitTestResult {
  getPose(referenceSpace: XRReferenceSpace): XRPose | null;
}

interface XRFrame {
  getHitTestResults(hitTestSource: XRHitTestSource): XRHitTestResult[];
}

interface XRPose {
  transform: {
    matrix: Float32Array;
  };
}

interface XRSession {
  requestReferenceSpace(type: string): Promise<XRReferenceSpace>;
  requestHitTestSource(options: { space: XRReferenceSpace }): Promise<XRHitTestSource>;
} 