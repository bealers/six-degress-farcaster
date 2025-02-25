/**
 * Generate a "No Connection Found" image
 */
function generateNoConnectionImage() {
  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <!-- Background gradient -->
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4F46E5" />
          <stop offset="100%" stop-color="#2563EB" />
        </linearGradient>
        <!-- Glow filter for text -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="15" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      <!-- Main background -->
      <rect width="1200" height="630" fill="url(#bg-gradient)" />
      
      <!-- Decorative elements -->
      <g opacity="0.2">
        <circle cx="200" cy="100" r="50" fill="white" />
        <circle cx="1000" cy="500" r="80" fill="white" />
        <circle cx="900" cy="150" r="40" fill="white" />
        <circle cx="300" cy="500" r="60" fill="white" />
        <circle cx="600" cy="50" r="30" fill="white" />
      </g>
      
      <!-- Connection visualization with X -->
      <g transform="translate(300, 300)">
        <!-- Left node -->
        <circle cx="0" cy="0" r="80" fill="#6366F1" stroke="white" stroke-width="4" />
        <text x="0" y="10" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="white" font-weight="bold">USER</text>
        
        <!-- Right node -->
        <circle cx="600" cy="0" r="80" fill="#6366F1" stroke="white" stroke-width="4" />
        <text x="600" y="10" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="white" font-weight="bold">TARGET</text>
        
        <!-- Broken connection line -->
        <line x1="85" y1="0" x2="250" y2="0" stroke="#EF4444" stroke-width="6" stroke-dasharray="20,10" />
        <line x1="350" y1="0" x2="515" y2="0" stroke="#EF4444" stroke-width="6" stroke-dasharray="20,10" />
        
        <!-- Red X mark -->
        <circle cx="300" cy="0" r="60" fill="#EF4444" />
        <path d="M270,-30 L330,30 M270,30 L330,-30" stroke="white" stroke-width="12" stroke-linecap="round" />
      </g>
      
      <!-- Main heading with glow effect -->
      <text x="600" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" fill="white" font-weight="bold" filter="url(#glow)">No Connection Found</text>
      
      <!-- Subtitle -->
      <text x="600" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="white">Try connecting with more users to expand your network!</text>
    </svg>
  `;
  
  return svg;
}

// Main execution
(async () => {
  console.log('Generating static images...');
  
  try {
    await Promise.all([
      saveImageToFile(generateResultImage(), 'public/static/result.png'),
      saveImageToFile(generateShareImage(), 'public/static/share.png'),
      saveImageToFile(generateErrorImage(), 'public/static/error.png'),
      saveImageToFile(generateInitialImage(), 'public/static/initial.png'),
      saveImageToFile(generateSearchImage(), 'public/static/search.png'),
      saveImageToFile(generateSplashImage(), 'public/static/splash.png'),
      saveImageToFile(generateNoConnectionImage(), 'public/static/no-connection.png')
    ]);
    
    console.log('✅ All images generated successfully');
  } catch (error) {
    console.error('❌ Error generating images:', error);
  }
})(); 