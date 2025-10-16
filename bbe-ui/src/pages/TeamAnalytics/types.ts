export interface ApiTeamInfo {
  team_number: number;
  alliance: "red" | "blue";
  metrics: {
    [key: string]: number;
  };
}

export interface TeamDataForCharts {
  team_number: number;
  name: string;
  epa: {
    total: number;
    auto: number;
    teleop: number;
    endgame: number;
    consistency: number;
  };
  point_contribution: {
    auto: number;
    teleop: number;
    endgame: number;
  };
}
