// @ts-expect-error: No types for 'swagger-ui-react'
import SwaggerUI from 'swagger-ui-react';
import React from 'react';
import 'swagger-ui-react/swagger-ui.css';
import './theme/theme-monokai.css'

const ApiDocsPage: React.FC = () => {
  // Determine swagger URL based on TESTING environment variable
  const isTesting = import.meta.env.VITE_TESTING === 'true';
  const swaggerUrl = isTesting 
    ? 'http://localhost:8080/swagger.json' 
    : 'http://172.16.194.210:8080/swagger.json';
  
  console.log(`ApiDocsPage: TESTING=${import.meta.env.VITE_TESTING}, swaggerUrl=${swaggerUrl}`);
  
  return (
    <main className="min-h-screen pt-32 pb-16 px-4 md:px-8 font-['Poppins'] bg-background text-text">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold text-accent mb-8">BBE API v1 Documentation</h1>
        <div className="bg-card border border-border rounded-lg p-4">
          <SwaggerUI url={swaggerUrl} />
        </div>
      </div>
    </main>
  );
};

export default ApiDocsPage; 