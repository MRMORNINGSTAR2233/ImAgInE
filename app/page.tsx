"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Layout from "@/components/Layout";
import dynamic from "next/dynamic";

// Dynamically import ARScene component to prevent SSR issues
const ARScene = dynamic(() => import("@/components/ARScene"), {
  ssr: false,
  loading: () => <div className="ar-loading text-center p-10">Loading AR experience...</div>,
});

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelDescription, setModelDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [modelType, setModelType] = useState<string | null>(null);

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setLoading(true);
    setError(null);
    setModelUrl(null); // Reset model URL when generating new model
    
    try {
      console.log('Sending request to generate model...');
      const response = await fetch('/api/generate', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received model data:', data);
      
      if (data.url) {
        setModelUrl(data.url);
        setModelDescription(data.description || null);
        setAiGenerated(data.aiGenerated || false);
        setModelType(data.modelType || null);
      } else {
        throw new Error("No model URL returned from API");
      }
    } catch (err) {
      console.error("Error generating AR model:", err);
      setError(`Failed to generate AR model: ${err instanceof Error ? err.message : "Unknown error"}`);
      setModelUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const renderModelInfo = () => {
    if (!modelUrl || !modelDescription) return null;

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">AI-Generated Model</CardTitle>
          <CardDescription>
            {aiGenerated ? "Created with Gemini AI" : "Using fallback model"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Model Type: <span className="font-normal">{modelType || "Unknown"}</span></p>
            <div>
              <p className="font-medium mb-1">Model Description:</p>
              <div className="bg-slate-50 p-3 rounded text-xs overflow-auto max-h-32">
                {modelDescription}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Generate 3D Model for AR</CardTitle>
            <CardDescription>
              Enter a description of what you'd like to see in AR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                placeholder="Describe what you want to create in AR..."
                value={prompt}
                onChange={handlePromptChange}
                disabled={loading}
              />
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button 
              onClick={handleGenerate} 
              disabled={loading || !prompt.trim()}
              className="w-full"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating with AI...
                </span>
              ) : "Generate AR Model"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Try: "A floating blue crystal", "A red dragon", "A futuristic robot", or "A magical lantern"
            </p>
          </CardFooter>
        </Card>

        {modelUrl && !loading && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AR Experience</CardTitle>
                <CardDescription>
                  Tap the "AR" button below to view in augmented reality
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="ar-container relative">
                  <ARScene modelUrl={modelUrl} />
                </div>
              </CardContent>
            </Card>
            
            {renderModelInfo()}
          </>
        )}

        {!modelUrl && !loading && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AR Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm list-disc pl-5 space-y-1">
                <li><strong>Device:</strong> Android phone with Chrome (best support)</li>
                <li><strong>Connection:</strong> HTTPS or localhost</li>
                <li><strong>Permissions:</strong> Camera access</li>
                <li><strong>Environment:</strong> Good lighting, textured surfaces</li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
