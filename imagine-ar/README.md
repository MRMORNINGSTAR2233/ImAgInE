# ImAgInE AR

A Next.js application that uses AI to generate 3D models and display them in Augmented Reality.

## Features

- Generates 3D models based on text prompts using an AI backend
- Displays models in AR using WebXR
- Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui

## Prerequisites

- Node.js 18+ and npm
- A compatible AR-capable device (Android phone with Chrome or iOS device with WebXR-compatible browser)
- AI backend service running (expects API at http://localhost:8000 by default)

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with the following content:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Adjust the URL to match your backend API endpoint.

4. Start the development server:

```bash
npm run dev
```

5. Open http://localhost:3000 in your browser

## Testing with the Sample Server

For testing purposes, a sample server is included that simulates the AI backend:

1. Start the sample server:

```bash
npm run server
```

2. The server will run on http://localhost:8000

3. You can test with different prompts:
   - "Create a cube"
   - "Give me a duck"
   - "Generate a robot"
   - "Show me a lantern"

The sample server will return pre-defined 3D models based on keywords in your prompt.

## Important Notes

- The application must be served over HTTPS or from localhost to enable WebXR features
- AR functionality requires a WebXR-compatible browser on a device with AR capabilities (most modern Android phones with Chrome work well)
- iOS devices require using browsers with WebXR support or polyfills

## Usage

1. Enter a text prompt describing what you want to create
2. Click "Generate & Enter AR"
3. When the model is ready, click "Enter AR"
4. Allow camera permissions when prompted
5. Point your camera at a flat surface
6. Tap the screen to place the 3D model

## Project Structure

- `app/` - Next.js application files
- `components/` - React components including:
  - `ARScene.tsx` - Three.js and WebXR implementation
  - `Layout.tsx` - Page layout with header
- `public/` - Static assets

## Technology Stack

- Next.js
- TypeScript
- Three.js
- WebXR
- Tailwind CSS
- shadcn/ui
