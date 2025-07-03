import { useState } from "react";

interface ModuleCardProps {
  title: string;
  summary: string;
  what: string;
  tech: string[];
  output: string;
  imageUrl: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  summary,
  what,
  tech,
  output,
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

export default ModuleCard;