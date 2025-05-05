import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Fallback models if AI generation fails
const fallbackModels = {
  'cube': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF/Box.gltf',
  'duck': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf',
  'robot': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/glTF/BrainStem.gltf',
  'lantern': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Lantern/glTF/Lantern.gltf',
};

// Generate 3D model using Gemini AI
async function generateModelWithAI(prompt: string) {
  try {
    // Use Gemini 1.5 Flash model instead of gemini-pro
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Send prompt to Gemini AI for 3D model generation guidance
    const result = await model.generateContent(`Create a detailed 3D model description for: ${prompt}. 
      Include specifications for shape, color, texture, size, and any unique features. 
      Format it as a structured JSON with parameters that can be used for 3D model generation.`);
    
    const response = await result.response;
    const modelDescription = response.text();
    
    console.log("AI Model Description:", modelDescription);
    
    // For now, we'll map common keywords to our sample models
    // In a real implementation, this would use the AI description to generate a GLTF model
    const keywords = prompt.toLowerCase();
    let modelType = 'generic';
    
    if (keywords.includes('cube') || keywords.includes('box') || keywords.includes('square')) {
      modelType = 'cube';
    } else if (keywords.includes('duck') || keywords.includes('bird') || keywords.includes('animal')) {
      modelType = 'duck';
    } else if (keywords.includes('robot') || keywords.includes('machine') || keywords.includes('mechanical')) {
      modelType = 'robot';
    } else if (keywords.includes('lantern') || keywords.includes('light') || keywords.includes('lamp')) {
      modelType = 'lantern';
    }
    
    return {
      modelUrl: fallbackModels[modelType as keyof typeof fallbackModels] || fallbackModels.cube,
      modelDescription: modelDescription,
      aiGenerated: true,
      modelType
    };
  } catch (error) {
    console.error('Error generating model with AI:', error);
    // Fall back to a default model
    return { 
      modelUrl: fallbackModels.cube,
      modelDescription: "Failed to generate AI description",
      aiGenerated: false,
      modelType: 'fallback'
    };
  }
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    console.log(`Generating 3D model for prompt: "${prompt}"`);
    const modelData = await generateModelWithAI(prompt);
    
    return NextResponse.json({ 
      url: modelData.modelUrl,
      description: modelData.modelDescription,
      aiGenerated: modelData.aiGenerated,
      modelType: modelData.modelType
    });
  } catch (error) {
    console.error('Error processing model generation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate model',
        url: fallbackModels.cube
      },
      { status: 500 }
    );
  }
} 