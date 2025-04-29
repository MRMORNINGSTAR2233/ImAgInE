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

// Default model URL for testing
const DEFAULT_TEST_MODEL = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF/Box.gltf";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [modelUrl, setModelUrl] = useState<string | null>(DEFAULT_TEST_MODEL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.url) {
        setModelUrl(data.url);
      } else {
        throw new Error("No model URL returned from API");
      }
    } catch (err) {
      console.error("Error generating AR model:", err);
      setError(`Failed to generate AR model: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
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
              {loading ? "Generating..." : "Generate & Enter AR"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Try: "Create a cube", "Show me a duck", "Generate a robot", or "Make a lantern"
            </p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AR Testing View</CardTitle>
            <CardDescription>
              This is a test AR view showing a default 3D model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="ar-container relative">
              <ARScene modelUrl={modelUrl || DEFAULT_TEST_MODEL} />
            </div>
          </CardContent>
        </Card>

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
      </div>
    </Layout>
  );
}
