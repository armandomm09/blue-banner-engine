import { motion } from "framer-motion";

const features = [
  {
    title: "Matchpoint Predictions",
    description:
      "The Oracle of FRC. Advanced machine learning models (XGBoost) trained on historical data to predict match outcomes with explainable AI insights.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-8 h-8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V19.875c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
    color: "from-blue-500/20 to-blue-600/10",
    accent: "text-blue-400",
  },
  {
    title: "Custom Scouting Engine",
    description:
      "Your forms, your rules. Build complex PIT and MATCH scouting forms with fully customizable schemas. Drag-and-drop simple, but power-user capable.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-8 h-8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 15.75h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
        />
      </svg>
    ),
    color: "from-accent/20 to-accent/10",
    accent: "text-accent",
  },
  {
    title: "Real-time Dashboards",
    description:
      "A high-performance spreadsheet grid designed for data velocity. Sorting, filtering, and live updates to keep your drive team ahead of the competition.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-8 h-8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V4.5m0 15a1.125 1.125 0 01-1.125 1.125m1.125-1.125h-7.5c-.621 0-1.125-.504-1.125-1.125m0 1.125v-1.5c0-.621.504-1.125 1.125-1.125m0 0h3.75m-3.75 0V7.5m0 0h3.75M12 7.5h3.75M12 7.5v6.375m0-6.375h3.75m0 0v6.375m-3.75 0h3.75"
        />
      </svg>
    ),
    color: "from-purple-500/20 to-purple-600/10",
    accent: "text-purple-400",
  },
  {
    title: "Team Intelligence Hub",
    description:
      "Unity through data. Manage your team, set roles, and customize your engine's theme to match your team's unique brand and colors.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-8 h-8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
    color: "from-emerald-500/20 to-emerald-600/10",
    accent: "text-emerald-400",
  },
];

export const FeatureShowcase = () => {
  return (
    <section className="py-32 px-4 md:px-8 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-sm font-black text-accent uppercase tracking-[0.3em] mb-4">
              Strategic Dominance
            </h2>
            <h3 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Engineered for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-400">
                Winning Alliances
              </span>
            </h3>
            <p className="max-w-3xl mx-auto text-xl text-text-muted leading-relaxed">
              Stop guessing. BBE provides the tools you need to quantify
              performance, predict outcomes, and execute winning strategies on
              the field.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className={`relative p-8 rounded-3xl border border-white/5 bg-gradient-to-br ${feature.color} backdrop-blur-sm group hover:border-accent/30 transition-all duration-300`}
    >
      <div className="flex flex-col h-full">
        <div
          className={`p-4 rounded-2xl bg-black/40 ${feature.accent} w-fit mb-6 group-hover:scale-110 transition-transform duration-300 shadow-2xl`}
        >
          {feature.icon}
        </div>

        <h4 className="text-2xl font-bold text-white mb-4 group-hover:text-accent transition-colors">
          {feature.title}
        </h4>

        <p className="text-text-muted leading-relaxed mb-8 flex-1">
          {feature.description}
        </p>

        <div className="flex items-center gap-2 text-sm font-bold text-white/50 group-hover:text-white transition-all cursor-pointer">
          Learn more
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};
