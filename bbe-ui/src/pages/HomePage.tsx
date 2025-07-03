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
    summary: "The predictive oracle that forecasts match outcomes and scores.",
    what: "Utilizes a classifier to predict the winning alliance and a regressor to estimate the final score for both alliances.",
    tech: ["XGBoost", "Scikit-learn", "Hyperparameters Optimization"],
    output: "A win probability and a predicted score for upcoming matches.",
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
  },
];



const HomePage: React.FC = () => {
  return (
    <main className="min-h-screen pt-32 p-4 md:p-8 font-['Poppins']">
      <div className="container mx-auto max-w-7xl text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4">
          Blue Banner Engine <span className="text-accent">(BBE)</span>
        </h1>
        <p className="max-w-4xl mx-auto mb-12 md:mb-20 text-lg md:text-xl text-text-muted font-light">
          An AI-driven scouting and strategy platform designed to provide FRC
          teams with a decisive competitive edge by transforming data into
          actionable intelligence.
        </p>
        <div className="mb-16">
             <Link to="/matchpoint" className="text-xl text-white bg-accent hover:bg-opacity-80 px-8 py-4 rounded-full font-bold transition-all shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 transform hover:-translate-y-1">
                Predict a Match Now
            </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          {modulesData.map((module, index) => (
            <ModuleCard imageUrl={""} key={index} {...module} />
          ))}
        </div>
      </div>
    </main>
  );
};

export default HomePage;