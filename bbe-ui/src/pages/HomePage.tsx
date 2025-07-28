import { Link } from "react-router-dom";
import ModuleCard from "../components/ModuleCard";

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

const HomePage: React.FC = () => {
  return (
    <main className="min-h-screen font-['Poppins']">
      {/* Hero Section */}
      <section className="relative py-20 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-accent/10"></div>
        <div className="relative container mx-auto max-w-7xl text-center">
          <div className="mb-8">
            <span className="inline-block px-4 py-2 bg-accent/20 text-accent rounded-full text-sm font-semibold mb-6">
              🔵 AI-Powered FRC Strategy Platform
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
            Blue Banner Engine
            <span className="block text-accent">(BBE)</span>
          </h1>
          
          <p className="max-w-4xl mx-auto mb-8 text-xl md:text-2xl text-text-muted font-light leading-relaxed">
            Transform data into <span className="text-accent font-semibold">actionable intelligence</span> and gain a decisive competitive edge in FIRST Robotics Competition.
          </p>
          
          <p className="max-w-3xl mx-auto mb-12 text-lg text-text-muted/80">
            Replace guesswork with data science. Understand not just what happened, but why it happened and what's most likely to happen next.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link 
              to="/matchpoint" 
              className="group relative px-8 py-4 bg-accent hover:bg-accent/90 text-white rounded-full font-bold text-lg transition-all duration-300 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 transform hover:-translate-y-1"
            >
              <span className="relative z-10">Start Predicting Matches</span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
            
            <Link 
              to="/docs/api/v1" 
              className="px-8 py-4 border-2 border-accent/30 text-accent hover:bg-accent/10 rounded-full font-semibold text-lg transition-all duration-300 hover:border-accent"
            >
              View API Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-16 px-4 md:px-8 bg-card/50">
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

      {/* Call to Action */}
      <section className="py-20 px-4 md:px-8 bg-gradient-to-r from-accent/20 to-accent/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Revolutionize Your FRC Strategy?
          </h2>
          <p className="text-xl text-text-muted mb-8">
            Join the teams already using BBE to make data-driven decisions and win more matches.
          </p>
          <Link 
            to="/matchpoint" 
            className="inline-block px-10 py-5 bg-accent hover:bg-accent/90 text-white rounded-full font-bold text-xl transition-all duration-300 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 transform hover:-translate-y-1"
          >
            Get Started Now
          </Link>
        </div>
      </section>
    </main>
  );
};

export default HomePage;