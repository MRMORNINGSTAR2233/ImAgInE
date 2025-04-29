const { exec } = require('child_process');
const path = require('path');
const readline = require('readline');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

console.log(`${colors.magenta}====================================${colors.reset}`);
console.log(`${colors.magenta}   Starting ImAgInE AR Application  ${colors.reset}`);
console.log(`${colors.magenta}====================================${colors.reset}`);

// Check if API key is set
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log(`${colors.yellow}Warning: GEMINI_API_KEY is not set in environment variables.${colors.reset}`);
  console.log(`${colors.yellow}You can set it using: export GEMINI_API_KEY=your_api_key${colors.reset}`);
  console.log(`${colors.yellow}Continuing with limited functionality (using fallback models).${colors.reset}`);
}

// Start backend API server
const apiServer = exec('node server.js');
console.log(`${colors.green}Starting API server...${colors.reset}`);

apiServer.stdout.on('data', (data) => {
  console.log(`${colors.cyan}[API] ${colors.reset}${data.trim()}`);
});

apiServer.stderr.on('data', (data) => {
  console.error(`${colors.red}[API ERROR] ${colors.reset}${data.trim()}`);
});

// Wait a moment for the API server to start before starting frontend
setTimeout(() => {
  // Start Next.js frontend
  console.log(`${colors.green}Starting frontend...${colors.reset}`);
  const frontendServer = exec('npx next dev');

  frontendServer.stdout.on('data', (data) => {
    console.log(`${colors.blue}[Frontend] ${colors.reset}${data.trim()}`);
  });

  frontendServer.stderr.on('data', (data) => {
    console.error(`${colors.red}[Frontend ERROR] ${colors.reset}${data.trim()}`);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log(`${colors.yellow}Shutting down servers...${colors.reset}`);
    apiServer.kill();
    frontendServer.kill();
    process.exit(0);
  });
}, 2000);

console.log(`${colors.green}Servers starting up. Press Ctrl+C to stop all services.${colors.reset}`); 