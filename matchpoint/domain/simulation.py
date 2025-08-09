from typing import Dict

class SimulationTracker:
    """
    A mutable class designed to actively track wins during a simulation process.
    It is initialized with the alliance numbers and total simulations,
    and wins are added via the `add_win` method.
    The __str__ method calculates and formats the final probabilities on demand.
    """
    def __init__(self, alliance_numbers: list[int], total_simulations: int, event_key: str):
        self._total_sims: int = total_simulations
        self.event_key = event_key
        # Internal dictionary to store the raw win counts, initialized to zero.
        self._win_counts: Dict[int, int] = {num: 0 for num in alliance_numbers}

    def add_win(self, alliance_number: int) -> None:
        """Increments the win count for a given alliance."""
        if alliance_number in self._win_counts:
            self._win_counts[alliance_number] += 1
        else:
            # This is a safeguard, though it shouldn't be triggered with proper initialization.
            print(f"Warning: Attempted to add a win for an unknown alliance: {alliance_number}")

    def __str__(self) -> str:
        """Overrides the default print behavior to display a formatted results table."""
        header = [
            "\n--- Simulation Results ---",
            f"******** {self.event_key} ********",
            "Alliance | Wins | Win Probability",
            "-----------------------------------"
        ]
        
        rows = []
        # Sort by alliance number for consistent output
        for alliance_num, count in sorted(self._win_counts.items()):
            # Calculate probability on-the-fly from stored counts
            probability = (count / self._total_sims) if self._total_sims > 0 else 0
            rows.append(f"{alliance_num:<8} | {count:<4} | {probability:.2%}")

        return "\n".join(header + rows)