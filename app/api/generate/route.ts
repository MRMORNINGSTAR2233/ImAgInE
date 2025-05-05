import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Fallback models if AI generation fails
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

// Categories and their related keywords
const modelCategories = {
  fish: ['fish', 'swimming', 'aquatic', 'marine', 'sea', 'ocean', 'water'],
  dragon: ['dragon', 'mythical', 'fantasy', 'flying', 'creature', 'magical', 'wings'],
  robot: ['robot', 'mechanical', 'machine', 'android', 'tech', 'futuristic', 'artificial'],
  lantern: ['lantern', 'light', 'lamp', 'illumination', 'glow', 'lighting'],
  animal: ['animal', 'creature', 'beast', 'wildlife', 'nature', 'living'],
  human: ['human', 'person', 'man', 'woman', 'figure', 'character', 'humanoid'],
  vehicle: ['vehicle', 'car', 'truck', 'transport', 'automobile', 'transportation'],
  cube: ['cube', 'box', 'square', 'geometric', 'simple']
};

// Generate 3D model using Gemini AI
async function generateModelWithAI(prompt: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      throw new Error('API key not configured');
    }

    // Use Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log('Sending prompt to Gemini AI:', prompt);
    
    // Get AI description
    const result = await model.generateContent(`Analyze this description and extract key characteristics for a 3D model: "${prompt}". 
      Consider elements like object type, shape, color, size, and special features. 
      Format response as JSON with these fields: mainCategory (primary object type), keywords (list of descriptive terms).`);
    
    const response = await result.response;
    const modelDescription = response.text();
    
    console.log("AI Model Description:", modelDescription);
    
    // Parse the AI response to get keywords
    let aiResponse;
    try {
      aiResponse = JSON.parse(modelDescription);
    } catch (e) {
      console.log('Failed to parse AI response as JSON, using text analysis');
      aiResponse = { mainCategory: '', keywords: prompt.toLowerCase().split(' ') };
    }

    // Combine prompt keywords and AI-generated keywords
    const allKeywords = [
      ...prompt.toLowerCase().split(' '),
      ...(aiResponse.keywords || []),
      aiResponse.mainCategory
    ].filter(Boolean);

    console.log('Analyzing keywords:', allKeywords);

    // Score each category based on keyword matches
    const categoryScores = Object.entries(modelCategories).map(([category, keywords]) => {
      const score = allKeywords.reduce((acc, keyword) => {
        return acc + (keywords.includes(keyword.toLowerCase()) ? 1 : 0);
      }, 0);
      return { category, score };
    });

    // Sort by score and get the best match
    const bestMatch = categoryScores.sort((a, b) => b.score - a.score)[0];
    const modelType = bestMatch.score > 0 ? bestMatch.category : 'default';

    console.log('Selected model type:', modelType);
    
    return {
      modelUrl: fallbackModels[modelType as keyof typeof fallbackModels] || fallbackModels.default,
      modelDescription: modelDescription,
      aiGenerated: true,
      modelType
    };
  } catch (error) {
    console.error('Error generating model with AI:', error);
    return { 
      modelUrl: fallbackModels.default,
      modelDescription: "Failed to generate AI description",
      aiGenerated: false,
      modelType: 'default'
    };
  }
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      console.error('No prompt provided');
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }
    
    console.log(`Generating 3D model for prompt: "${prompt}"`);
    const modelData = await generateModelWithAI(prompt);
    
    if (!modelData.modelUrl) {
      console.error('No model URL generated');
      throw new Error('Failed to generate model URL');
    }
    
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
        url: fallbackModels.default
      },
      { status: 500 }
    );
  }
} 