import json
from datetime import datetime, timezone
from typing import Dict, List

class SimulationTracker:
    """
    A mutable class to actively track wins during a simulation process.
    It now stores full alliance composition and can export results to JSON.
    """
    def __init__(self, alliances: List[List[int]], total_simulations: int, event_key: str):
        self._total_sims: int = total_simulations
        self.event_key: str = event_key
        # Store the full alliance structure (e.g., [[team1, team2, team3], ...])
        self._alliances: List[List[int]] = alliances
        # Internal dictionary to store the raw win counts, initialized to zero.
        # Keys are the alliance numbers (1, 2, 3, etc.)
        self._win_counts: Dict[int, int] = {i + 1: 0 for i in range(len(alliances))}

    def add_win(self, alliance_number: int) -> None:
        """Increments the win count for a given alliance."""
        if alliance_number in self._win_counts:
            self._win_counts[alliance_number] += 1
        else:
            print(f"Warning: Attempted to add a win for an unknown alliance: {alliance_number}")

    def to_json(self, indent: int = 4) -> str:
        """
        Exports all simulation information to a formatted JSON string.
        
        Args:
            indent: The number of spaces to use for JSON indentation for readability.
        
        Returns:
            A JSON formatted string with the complete simulation results.
        """
        results_data = []
        for i, teams in enumerate(self._alliances):
            alliance_num = i + 1
            win_count = self._win_counts.get(alliance_num, 0)
            win_probability = (win_count / self._total_sims) if self._total_sims > 0 else 0
            
            results_data.append({
                "alliance_number": alliance_num,
                "teams": teams,
                "wins": win_count,
                "win_probability": round(win_probability, 4)
            })

        # Structure the full output
        output_dict = {
            "event_key": self.event_key,
            "simulation_metadata": {
                "total_simulations_run": self._total_sims,
                "timestamp_utc": datetime.now(timezone.utc).isoformat()
            },
            "results": results_data
        }
        
        return json.dumps(output_dict, indent=indent)

    def __str__(self) -> str:
        """Display a formatted results table, now including alliance teams."""
        header = [
            f"\n--- Simulation Results: {self.event_key} ---",
            "Alliance | Teams                  | Wins | Win Probability",
            "----------------------------------------------------------"
        ]
        
        rows = []
        for i, teams in enumerate(self._alliances):
            alliance_num = i + 1
            count = self._win_counts.get(alliance_num, 0)
            probability = (count / self._total_sims) if self._total_sims > 0 else 0
            
            # Format teams list into a clean string
            teams_str = ", ".join(map(str, teams))
            rows.append(f"{alliance_num:<8} | {teams_str:<22} | {count:<4} | {probability:.2%}")

        return "\n".join(header + rows)