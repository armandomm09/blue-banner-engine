import ModuleCard from '../ModuleCard';

interface ModuleCardProps {
    title: string;
    summary: string;
    what: string;
    tech: string[];
    output: string;
  }

const modulesData: ModuleCardProps[] = [
    {
      title: "Matchpoint (MP)",
      summary: "The Oracle - Predicts match outcomes and scores with machine learning precision.",
      what: "A machine learning model that predicts match outcomes, including the winning alliance and final scores using Gradient Boosting (XGBoost) trained on thousands of historical match data points.",
      tech: ["XGBoost", "Scikit-learn", "SHAP Analysis", "The Blue Alliance API"],
      output: "Win probability and predicted scores for upcoming matches with explainable AI insights.",
    },
    {
      title: "OPL (Optimal Pick-Lister)",
      summary: "The Architect - Builds winning alliances through intelligent simulation.",
      what: "A simulation-based system that generates an Optimal Pick List (OPL) for alliance selection using Monte Carlo simulation to identify teams offering the greatest synergistic advantage.",
      tech: ["Monte Carlo Simulation", "Heuristic Optimization", "Matchpoint Integration"],
      output: "A ranked list of the best-available teams to pick during alliance selection.",
    },
    {
      title: "The Playbook (PBK)",
      summary: "The Coach - Translates data into actionable strategic advice.",
      what: "An AI-powered engine that uses SHAP to understand why Matchpoint made its prediction and generates clear, actionable pre-match strategic advice.",
      tech: ["SHAP Analysis", "Rule-Based Logic", "Strategic Intelligence"],
      output: "Concise strategic briefs with 'Key to Winning' and 'Primary Threat' insights.",
    },
    {
      title: "Heat Seeker (HS)",
      summary: "The Cartographer - Maps robot movement and field control through computer vision.",
      what: "A Computer Vision module that analyzes match videos to generate heatmaps and trajectory plots, revealing teams' field control, typical scoring paths, and defensive positioning.",
      tech: ["YOLOv8", "Computer Vision", "Multiple Object Tracking", "Data Visualization"],
      output: "Visual heatmaps and trajectory plots for spatial strategy analysis.",
    },
    {
      title: "Woodie",
      summary: "The Omniscient - Your friendly conversational AI assistant for FRC data.",
      what: "A conversational chatbot providing instant access to all FRC data and BBE insights, democratizing data access for the entire team through natural language queries.",
      tech: ["Discord.py", "RAG with LLMs", "TBA & BBE API Integration"],
      output: "Instant, on-demand answers and analysis accessible to any team member.",
    },
  ];

export const ModulesSection = () => {
    return (
        <section className="py-20 px-4 md:px-8 bg-card/50 relative z-30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Five Pillars of Strategic Excellence
            </h2>
            <p className="max-w-3xl mx-auto text-xl text-text-muted">
              BBE is built on five interconnected modules, each designed to solve a specific strategic challenge in FRC competition.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {modulesData.map((module, index) => (
              <ModuleCard 
                key={index} 
                {...module} 
                imageUrl=""
              />
            ))}
          </div>
        </div>
      </section>
    );
}