import React, { useState } from "react";

// --- TYPE DEFINITIONS ---
interface ModuleCardProps {
  title: string;
  summary: string;
  what: string;
  tech: string[];
  output: string;
  imageUrl: string;
}

// --- DATA FOR THE MODULES ---
const modulesData: ModuleCardProps[] = [
  {
    title: "Matchpoint (MP)",
    summary: "The predictive oracle that forecasts match outcomes and scores.",
    what: "Utilizes a classifier to predict the winning alliance and a regressor to estimate the final score for both alliances.",
    tech: ["XGBoost", "Scikit-learn", "Hyperparameters Optimization"],
    output: "A win probability and a predicted score for upcoming matches.",
    imageUrl:
      "https://images.unsplash.com/photo-1599249253952-7936a1783742?auto=format&fit=crop&q=80&w=1740",
  },
  {
    title: "AOS (Alliance Optimization System)",
    summary:
      "The architect that builds winning alliances by generating an Optimal Pick List (OPL).",
    what: "Simulates n number of tournament scenarios to identify which available teams offer the greatest synergistic advantage and increase the probability of winning the entire event.",
    tech: [
      "Monte Carlo Simulation",
      "Heuristic Optimization Models",
      "Matchpoint for predictions",
    ],
    output:
      "A ranked list of the best-available teams to pick during alliance selection.",
    imageUrl:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=1932",
  },
  {
    title: "Heat Seeker (HS)",
    summary:
      "The cartographer that uses Computer Vision to analyze robot movement and field control.",
    what: "Processes match videos to generate heatmaps and trajectory plots, revealing teams' operational zones, cycle paths, and strategic positioning.",
    tech: [
      "Computer Vision (YOLOv8)",
      "Multiple Object Tracking (MOT)",
      "Data Visualization",
    ],
    output: "Visual heatmaps and path diagrams for strategic analysis.",
    imageUrl:
      "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&q=80&w=1740",
  },
  {
    title: "The Playbook (PBK)",
    summary:
      "The strategic coach that translates complex data into simple, actionable pre-match advice.",
    what: "Analyzes model predictions using SHAP to identify key strengths, weaknesses, and threats, then presents them as clear strategic recommendations.",
    tech: [
      "SHAP (SHapley Additive exPlanations)",
      "Rule-Based Logic",
      "LLM for summarization",
    ],
    output:
      "A concise strategic brief with insights like 'Key to Winning' and 'Primary Threat'.",
    imageUrl:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=1740",
  },
  {
    title: "Woodie",
    summary:
      "The conversational agent providing instant access to all FRC data and BBE insights.",
    what: "A chatbot (for Discord) that answers natural language questions about teams, matches, predictions, and strategic recommendations from the BBE suite.",
    tech: [
      "Discord.py API Integration",
      "TBA & BBE API Integration",
      "RAG with LLMs",
    ],
    output: "Instant, on-demand answers and analysis for any team member.",
    imageUrl:
      "https://images.unsplash.com/photo-1589254065909-b7086229d08c?auto=format&fit=crop&q=80&w=1287",
  },
];

// --- REUSABLE MODULE CARD COMPONENT ---
const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  summary,
  what,
  tech,
  output,
  imageUrl,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => setIsExpanded(!isExpanded);

  return (
    <div
      className={`
                bg-card rounded-xl p-6 md:p-8 cursor-pointer 
                border transitin-all duration-300 ease-in-out
                hover:transform hover:-translate-y-2 hover:shadow-2xl 
                ${
                  isExpanded
                    ? "border-accent shadow-lg shadow-accent/20"
                    : "border-border shadow-lg shadow-black/30"
                }
            `}
      onClick={handleToggle}
    >
      <h3 className="text-2xl md:text-3xl font-bold text-accent mb-2">
        {title}
      </h3>
      <p className="text-text-muted font-light min-h-[3rem]">{summary}</p>

      <div
        className={`
                transition-all duration-700 ease-in-out overflow-hidden
                ${
                  isExpanded
                    ? "max-h-[1000px] mt-6 pt-6 border-t border-border"
                    : "max-h-0"
                }
            `}
      >
        <h4 className="text-lg font-semibold text-accent mb-2">What it Does</h4>
        <p className="font-light text-text/90 mb-4">{what}</p>

        <h4 className="text-lg font-semibold text-accent mb-2">
          Key Technologies
        </h4>
        <ul className="list-disc list-inside mb-4 font-light text-text/90">
          {tech.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>

        <h4 className="text-lg font-semibold text-accent mb-2">
          Primary Output
        </h4>
        <p className="font-light text-text/90">{output}</p>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
function App() {
  return (
    <main className="min-h-screen p-4 md:p-8 font-['Poppins']">
      <div className="container mx-auto max-w-7xl text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4">
          Blue Banner Engine <span className="text-accent">(BBE)</span>
        </h1>
        <p className="max-w-4xl mx-auto mb-12 md:mb-20 text-lg md:text-xl text-text-muted font-light">
          An AI-driven scouting and strategy platform designed to provide FRC
          teams with a decisive competitive edge by transforming data into
          actionable intelligence.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          {modulesData.map((module, index) => (
            <ModuleCard key={index} {...module} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default App;
