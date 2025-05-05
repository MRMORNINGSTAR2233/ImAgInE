import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Fallback models with reliable CDN-hosted URLs
const fallbackModels = {
  'cube': 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Box/glTF/Box.gltf',
  'fish': 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Duck/glTF/Duck.gltf',
  'dragon': 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Dragon/glTF/Dragon.gltf',
  'robot': 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/BrainStem/glTF/BrainStem.gltf',
  'lantern': 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Lantern/glTF/Lantern.gltf',
  'animal': 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Fox/glTF/Fox.gltf',
  'human': 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Soldier/glTF/Soldier.gltf',
  'vehicle': 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMilkTruck/glTF/CesiumMilkTruck.gltf',
  'default': 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Box/glTF/Box.gltf'
};

// Ensure all URLs are valid and working
async function validateModelUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error validating model URL:', error);
    return false;
  }
}

// Categories and their related keywords
const modelCategories = {
  fish: ['fish', 'swimming', 'aquatic', 'marine', 'sea', 'ocean', 'water', 'whale', 'shark'],
  dragon: ['dragon', 'mythical', 'fantasy', 'flying', 'creature', 'magical', 'wings', 'fire', 'red'],
  robot: ['robot', 'mechanical', 'machine', 'android', 'tech', 'futuristic', 'artificial', 'metallic'],
  lantern: ['lantern', 'light', 'lamp', 'illumination', 'glow', 'lighting', 'candle'],
  animal: ['animal', 'creature', 'beast', 'wildlife', 'nature', 'living', 'fur', 'fox', 'dog', 'cat'],
  human: ['human', 'person', 'man', 'woman', 'figure', 'character', 'humanoid', 'soldier', 'people'],
  vehicle: ['vehicle', 'car', 'truck', 'transport', 'automobile', 'transportation', 'wheels'],
  cube: ['cube', 'box', 'square', 'geometric', 'simple', 'basic']
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
    
    // Get AI description with retry
    const getAIResponse = async (retries = 1) => {
      try {
        const result = await model.generateContent(`Analyze this description and extract key characteristics for a 3D model: "${prompt}". 
          Consider elements like object type, shape, color, size, and special features. 
          Format response as JSON with these fields: mainCategory (primary object type), keywords (list of descriptive terms).`);
        
        const response = await result.response;
        return response.text();
      } catch (error) {
        console.error(`AI request failed (attempt ${retries}/3):`, error);
        if (retries < 3) {
          // Wait 1 second and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return getAIResponse(retries + 1);
        }
        throw error;
      }
    };
    
    const modelDescription = await getAIResponse();
    console.log("AI Model Description:", modelDescription);
    
    // Parse the AI response to get keywords
    let aiResponse;
    try {
      // Extract JSON if it's wrapped in backticks
      const jsonMatch = modelDescription.match(/```json\s*([\s\S]*?)\s*```/) || 
                        modelDescription.match(/```\s*([\s\S]*?)\s*```/) ||
                        modelDescription.match(/\{[\s\S]*\}/);
                        
      const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : modelDescription;
      aiResponse = JSON.parse(jsonText);
    } catch (e) {
      console.log('Failed to parse AI response as JSON, using text analysis', e);
      // Extract keywords manually from the text
      const words = prompt.toLowerCase().split(/\s+/);
      aiResponse = { 
        mainCategory: '', 
        keywords: words
      };
    }

    // Combine prompt keywords and AI-generated keywords
    const allKeywords = [
      ...prompt.toLowerCase().split(/\s+/),
      ...(aiResponse.keywords || []),
      aiResponse.mainCategory
    ].filter(Boolean).map(k => k.toLowerCase());

    console.log('Analyzing keywords:', allKeywords);

    // Score each category based on keyword matches
    const categoryScores = Object.entries(modelCategories).map(([category, keywords]) => {
      const score = allKeywords.reduce((acc, keyword) => {
        return acc + (keywords.some(k => keyword.includes(k)) ? 1 : 0);
      }, 0);
      return { category, score };
    });

    // Sort by score and get the best match
    const bestMatch = categoryScores.sort((a, b) => b.score - a.score)[0];
    const modelType = bestMatch.score > 0 ? bestMatch.category : 'default';

    console.log('Selected model type:', modelType);
    
    // Get the model URL
    const modelUrl = fallbackModels[modelType as keyof typeof fallbackModels] || fallbackModels.default;
    
    // Validate the URL works
    const isValid = await validateModelUrl(modelUrl);
    if (!isValid) {
      console.warn(`Model URL validation failed: ${modelUrl}, falling back to default`);
      return {
        modelUrl: fallbackModels.default,
        modelDescription: modelDescription,
        aiGenerated: true,
        modelType: 'default'
      };
    }
    
    return {
      modelUrl: modelUrl,
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