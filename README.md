# ImAgInE AR

A web-based augmented reality application that uses AI to generate 3D models based on user prompts.

## Features

- Text-to-3D model generation using Gemini AI
- WebXR-powered AR experience
- Real-time model placement in your environment
- Works on compatible Android devices with Chrome

## Requirements

- Node.js (v14+)
- A modern web browser with WebXR support (Chrome on Android recommended)
- HTTPS or localhost for AR features
- Google Gemini API key (for AI model generation)

## Getting Started

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up your Gemini API key:
   ```
   export GEMINI_API_KEY=your_api_key_here
   ```
   (For Windows, use `set GEMINI_API_KEY=your_api_key_here`)

4. Start the application:
   ```
   node start.js
   ```
   This will start both the frontend and backend servers.

5. Open your browser and navigate to `http://localhost:3000`

## Using the Application

1. Enter a text prompt describing what you want to create in AR
2. Click "Generate AR Model"
3. Once the model is loaded, tap the "AR" button that appears
4. Allow camera access when prompted
5. Point your device at a flat surface
6. Tap the screen when the placement indicator appears to place the 3D model
7. You can place multiple instances of the model in your environment

## Compatibility

- **Fully supported**: Android devices with Chrome browser
- **Limited support**: iOS devices with Safari (iOS 13+), but with limited features
- **Not supported**: Desktop browsers (will show 3D preview but not AR)

## Troubleshooting

- **Camera Permission**: Ensure you've granted camera access to the web application
- **AR Not Working**: Make sure you're on a compatible device and browser
- **Models Not Loading**: Check your internet connection or try a different prompt

## Development

- Frontend: Next.js with TypeScript
- 3D Rendering: Three.js
- AR: WebXR with Three.js
- Backend: Express.js
- AI: Google Gemini API

### Project Structure

- `/app` - Next.js app components and pages
- `/components` - React components including the AR scene
- `/lib` - Utility functions and helpers
- `/public` - Static assets and generated models
- `server.js` - Express backend for AI model generation

###Disclaimer
Currently the project is on hold due minor problems but open for continuations and contributions.
