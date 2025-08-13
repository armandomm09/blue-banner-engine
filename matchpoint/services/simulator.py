import json
from textwrap import indent
from matchpoint.domain.simulation import SimulationTracker
from ..third_parties.fetcher import Fetcher
from .mp_prediction import MatchpointPredictor as MP
from ..third_parties.statbotics import SBService
from ..third_parties.tba import TBAService
import random
from time import time


class Simulator:
    def __init__(self):
        self.sb = SBService()
        self.tba = TBAService()
        self.mp = MP()

    def shrink(self, p, alpha):
        """
        Shrink probability p toward 0.5 by fraction alpha (0 = no shrink, 1 = full shrink).
        alpha should be between 0 and 1.
        """
        alpha = 1 - alpha
        return 0.5 + alpha * (p - 0.5)

    def determine_match_winner_fast(
        self, red_alliance_number, blue_alliance_number, precomputed_probs
    ):
        """
        Determines a winner based on pre-computed probabilities.
        This is extremely fast as it only involves a dictionary lookup and a random check.
        """
        if red_alliance_number is None:
            return blue_alliance_number
        if blue_alliance_number is None:
            return red_alliance_number

        # Instant lookup of the pre-computed probability
        prob_red_wins = precomputed_probs[(red_alliance_number, blue_alliance_number)]

        return (
            red_alliance_number
            if random.random() < self.shrink(prob_red_wins, 0.2)
            else blue_alliance_number
        )

    def precompute_win_probabilities(
        self,
        alliances: list[list[int]],
        event_week: int,
        all_sb_stats: dict,
        all_tba_stats: dict,
    ) -> dict:
        """
        Pre-calculates win probabilities by passing pre-fetched data down
        to the feature assembly function.
        """
        # print("Pre-computing win probabilities for all possible matchups...")
        win_probs = {}
        num_alliances = len(alliances)

        for i in range(num_alliances):
            for j in range(i + 1, num_alliances):
                red_alliance_number = i + 1
                blue_alliance_number = j + 1

                # Fast function to assemble features from existing data
                ordered_features = Fetcher.get_match_features_from_prefetched_data(
                    red_teams=alliances[i],
                    blue_teams=alliances[j],
                    event_week=event_week,
                    all_sb_stats=all_sb_stats,
                    all_tba_stats=all_tba_stats,
                )

                # The prediction logic
                prediction = self.mp.predict_match_by_features(ordered_features)

                prob_red_wins = prediction.win_probability["red"]
                win_probs[(red_alliance_number, blue_alliance_number)] = prob_red_wins
                win_probs[(blue_alliance_number, red_alliance_number)] = (
                    1.0 - prob_red_wins
                )

        # print("Pre-computation complete.")
        return win_probs

    def simulate_frc_tournament_fast(self, precomputed_probs):
        """
        Runs a full simulation using the ultra-fast winner determination function.
        """
        match_results = {}

        def play_and_record_match(
            match_number, red_alliance_number, blue_alliance_number
        ):
            winner = self.determine_match_winner_fast(
                red_alliance_number, blue_alliance_number, precomputed_probs
            )
            loser = (
                blue_alliance_number
                if winner == red_alliance_number
                else red_alliance_number
            )
            match_results[match_number] = {"winner": winner, "loser": loser}

        # The simulation logic
        play_and_record_match("M1", 1, 8)
        play_and_record_match("M2", 4, 5)
        play_and_record_match("M3", 3, 6)
        play_and_record_match("M4", 2, 7)
        play_and_record_match(
            "M5", match_results["M1"]["loser"], match_results["M2"]["loser"]
        )
        play_and_record_match(
            "M6", match_results["M3"]["loser"], match_results["M4"]["loser"]
        )
        play_and_record_match(
            "M7", match_results["M1"]["winner"], match_results["M2"]["winner"]
        )
        play_and_record_match(
            "M8", match_results["M3"]["winner"], match_results["M4"]["winner"]
        )
        play_and_record_match(
            "M9", match_results["M7"]["loser"], match_results["M6"]["winner"]
        )
        play_and_record_match(
            "M10", match_results["M8"]["loser"], match_results["M5"]["winner"]
        )
        play_and_record_match(
            "M11", match_results["M10"]["winner"], match_results["M9"]["winner"]
        )
        play_and_record_match(
            "M12", match_results["M7"]["winner"], match_results["M8"]["winner"]
        )
        play_and_record_match(
            "M13", match_results["M12"]["loser"], match_results["M11"]["winner"]
        )

        upper_champion = match_results["M12"]["winner"]
        lower_champion = match_results["M13"]["winner"]

        final_score = {upper_champion: 0, lower_champion: 0}
        for _ in range(3):  # Max 3 final matches
            match_winner = self.determine_match_winner_fast(
                upper_champion, lower_champion, precomputed_probs
            )
            final_score[match_winner] += 1
            if final_score[match_winner] == 2:
                return match_winner

        return max(final_score, key=final_score.get)

    def simulate_n_playoffs(self, event_key, n_times):

        all_teams_flat, alliances = self.tba.get_alliances(event_key)

        event_week = Fetcher.tba.get_event_week(event_key)
        if event_week is None:
            event_week = 8  # Default week if not found

        # Get all team stats from both sources concurrently
        all_sb_stats = Fetcher.sb.get_all_sb_stats_for_event(event_key, all_teams_flat)
        all_tba_stats = Fetcher.tba.get_all_tba_stats_for_event_from_single_call(
            event_key, all_teams_flat
        )
        all_tba_stats = dict(sorted(all_tba_stats.items()))  # Sort for consistency
        # --- END OF NETWORK CALLS ---
        # print(all_tba_stats)
        # Pass the pre-fetched data to the pre-computation function
        precomputed_win_probs = self.precompute_win_probabilities(
            alliances=alliances,
            event_week=event_week,
            all_sb_stats=all_sb_stats,
            all_tba_stats=all_tba_stats,
        )

        results_tracker = SimulationTracker(
            alliances=alliances, total_simulations=n_times, event_key=event_key
        )
        initial_time = time()
        for i in range(n_times):

            winner = self.simulate_frc_tournament_fast(precomputed_win_probs)
            results_tracker.add_win(winner)
        end_time = time() - initial_time

        return results_tracker
