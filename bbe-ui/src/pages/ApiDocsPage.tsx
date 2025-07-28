// @ts-expect-error: No types for 'swagger-ui-react'
import SwaggerUI from 'swagger-ui-react';
import React from 'react';
import 'swagger-ui-react/swagger-ui.css';
import './theme/theme-monokai.css'
const ApiDocsPage: React.FC = () => {
  return (
    <main className="min-h-screen pt-32 pb-16 px-4 md:px-8 font-['Poppins'] bg-background text-text">
      <div className="container mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold text-accent mb-8">BBE API v1 Documentation</h1>
        <div className="bg-card border border-border rounded-lg p-4">
          <SwaggerUI url="http://localhost:8080/swagger.json" />
        </div>
      </div>
    </main>
  );
};

export default ApiDocsPage; 