from textwrap import indent
import requests
from .tba import TBAService
from .statbotics import SBService
from ..config import TBA_BASE_URL, TBA_HEADER, FEATURE_ORDER
import functools
from typing import Dict, Any
import json

class Fetcher:
    """
    A utility class to fetch and process data from The Blue Alliance (TBA)
    and Statbotics APIs.

    This class provides static methods to retrieve team and match features for
    FIRST Robotics Competition events.
    """

    sb = SBService()
    tba = TBAService()

    @staticmethod
    def get_match_features(match_key: str) -> tuple[dict | None, dict]:
        """
        Fetches and compiles a feature set for a specific match.

        This method retrieves team information for a given match, fetches statistics
        for each participating team from both Statbotics and TBA, combines them,
        and then orders them according to the FEATURE_ORDER constant.

        Args:
            match_key (str): The key for the match (e.g., '2023cada_qm1').

        Returns:
            tuple[dict | None, dict]: A tuple containing:
                - A dictionary with ordered features for the match (or None if error)
                - A dictionary mapping alliance positions to team numbers
        """
        event_key = match_key.split("_")[0]

        try:
            req = requests.get(
                f"{TBA_BASE_URL}/match/{match_key}/simple",
                TBA_HEADER,
            )
            req.raise_for_status()
            alliances = req.json()["alliances"]

            red_teams = [team[3:] for team in alliances["red"]["team_keys"]]
            blue_teams = [team[3:] for team in alliances["blue"]["team_keys"]]

            # Create team mapping dictionary
            team_mapping = {
                f"red{i+1}": int(team) for i, team in enumerate(red_teams)
            }
            team_mapping.update({
                f"blue{i+1}": int(team) for i, team in enumerate(blue_teams)
            })

            event_week = Fetcher.tba.get_event_week(event_key)

            raw_features = {}
            raw_features["week"] = 8 if event_week is None else event_week

            all_teams = red_teams + blue_teams

            print("teams", tuple(all_teams))
            sb_stats_dict = Fetcher.sb.get_all_sb_stats_for_event(
                event_key, tuple(all_teams)
            )
            tba_stats_dict = Fetcher.tba.get_all_tba_stats_for_event_from_single_call(
                event_key, tuple(all_teams)
            )

            for i in range(3):
                red_team = red_teams[i]
                blue_team = blue_teams[i]

                # Combine Statbotics and TBA stats for each team
                red_team_stats = (sb_stats_dict.get(red_team, {}) or {}) | (
                    tba_stats_dict.get(red_team, {}) or {}
                )
                blue_team_stats = (sb_stats_dict.get(blue_team, {}) or {}) | (
                    tba_stats_dict.get(blue_team, {}) or {}
                )

                for stat_name, value in red_team_stats.items():
                    if stat_name not in ["team", "event"]:
                        raw_features[f"red{i+1}_{stat_name}"] = value

                for stat_name, value in blue_team_stats.items():
                    if stat_name not in ["team", "event"]:
                        raw_features[f"blue{i+1}_{stat_name}"] = value

            # Ensure all features from FEATURE_ORDER are present, defaulting to 0.0
            ordered_match_features = {
                feature: raw_features.get(feature, 0.0) for feature in FEATURE_ORDER
            }

            return ordered_match_features, team_mapping

        except requests.exceptions.RequestException as e:
            print(f"Error fetching data for match {match_key}: {e}")
            return None
        except KeyError as e:
            print(f"Error processing match {match_key}. Missing team or key?: {e}")
            return None

    @staticmethod
    def get_match_features_from_prefetched_data(
        red_teams: list[int],
        blue_teams: list[int],
        event_week: int,
        all_sb_stats: dict,
        all_tba_stats: dict,
    ) -> dict:
        """
        Assembles the feature vector for a match using pre-fetched data.
        This function performs NO network requests and is very fast.
        """
        raw_features = {"week": event_week}

        for i in range(3):
            red_team = red_teams[i]
            blue_team = blue_teams[i]

            # Look up stats from the pre-fetched dictionaries
            red_team_sb_stats = all_sb_stats.get(red_team, {}) or {}
            red_team_tba_stats = all_tba_stats.get(str(red_team), {}) or {}
            # print("RED TEAM STATS:", red_team, all_tba_stats[str(red_team)])
            blue_team_sb_stats = all_sb_stats.get(blue_team, {}) or {}
            blue_team_tba_stats = all_tba_stats.get(str(blue_team), {}) or {}

            # Combine Statbotics and TBA stats for each team using the dictionary union operator
            red_team_stats = red_team_sb_stats | red_team_tba_stats
            blue_team_stats = blue_team_sb_stats | blue_team_tba_stats

            for stat_name, value in red_team_stats.items():
                if stat_name not in ["team", "event"]:
                    raw_features[f"red{i+1}_{stat_name}"] = value

            for stat_name, value in blue_team_stats.items():
                if stat_name not in ["team", "event"]:
                    raw_features[f"blue{i+1}_{stat_name}"] = value
                    

        # Ensure all features from FEATURE_ORDER are present, defaulting to 0.0
        ordered_match_features = {
            feature: raw_features.get(feature, 0.0) for feature in FEATURE_ORDER
        }
        # print(f"\n\nORDERED: {ordered_match_features}\n\n")
        missing_features = [
            feature
            for feature in FEATURE_ORDER
            if feature not in ordered_match_features
            or ordered_match_features[feature] is None
        ]
        if missing_features:
            # print(json.dumps(ordered_match_features, indent=4))
            # print(f"Missing required features in match features: {blue_teams} {missing_features}")
            raise ValueError(
                f"Missing required features in match features: {missing_features}")

        return ordered_match_features

    @staticmethod
    def get_team_features(team: str, event_key: str) -> dict:
        """
        Fetches combined Statbotics and TBA stats for a single team at an event.

        Args:
            team (str): The team number (e.g., '254').
            event_key (str): The event key (e.g., '2023casj').

        Returns:
            dict: A dictionary containing the merged stats from both Statbotics
                  and TBA for the specified team and event.
        """
        team = str(team)
        sb_stats = Fetcher.sb.get_sb_team_stats_event(team, event_key)
        tba_stats = Fetcher.tba.get_tba_oprs_team_event(team, event_key)

        return sb_stats | tba_stats

    
    @staticmethod
    @functools.lru_cache(maxsize=16)
    def get_all_team_features_for_event(event_key: str) -> Dict[str, Dict[str, Any]]:
        """
        Fetches all features for every team participating in a given event.

        This method is cached to avoid redundant API calls for the same event. It
        retrieves a list of all teams at an event and then concurrently fetches
        their stats from both Statbotics and TBA.

        Args:
            event_key (str): The key for the event (e.g., '2023cada').

        Returns:
            Dict[str, Dict[str, Any]]: A dictionary where keys are team numbers
            and values are dictionaries of their combined features. Returns an
            empty dictionary on failure.
        """
        try:
            req = requests.get(
                f"{TBA_BASE_URL}/event/{event_key}/teams/keys", headers=TBA_HEADER
            )
            req.raise_for_status()

            # Creates a tuple of team numbers (e.g., ('254', '1114', ...))
            team_keys = tuple(key[3:] for key in req.json())

            all_sb_stats = Fetcher.sb.get_all_sb_stats_for_event(event_key, team_keys)
            all_tba_stats = Fetcher.tba.get_all_tba_stats_for_event_from_single_call(
                event_key, team_keys
            )

            all_team_features = {}
            for team_key in team_keys:
                sb_stats = all_sb_stats.get(team_key, {}) or {}

                tba_stats = {
                    stat: data.get(f"frc{team_key}", 0.0)
                    for stat, data in all_tba_stats.items()
                }

                all_team_features[team_key] = sb_stats | tba_stats

            print(f"--- Data fetched for {len(all_team_features)} teams. ---")
            return all_team_features

        except requests.exceptions.RequestException as e:
            print(f"ERROR: Network failure fetching team data for {event_key}: {e}")
            return {}
        except KeyError as e:
            print(f"ERROR: Missing key while fetching team data for {event_key}: {e}")
            return {}
        
    @staticmethod
    def get_custom_teams_features(event_key: str, teams: list[int]) -> list[dict] | None:
        """
        Obtiene y compila un conjunto de características para una lista específica de equipos.
        """
        try:
            team_strings = [str(t) for t in teams]
            # Obtenemos todos los datos de Statbotics y TBA en llamadas masivas
            sb_stats_dict = Fetcher.sb.get_all_sb_stats_for_event(event_key, tuple(team_strings))
            tba_stats_dict = Fetcher.tba.get_all_tba_stats_for_event_from_single_call(event_key, tuple(team_strings))

            # Obtenemos los nombres de los equipos
            # (Esto puede requerir una nueva función en tu clase TBA para obtener varios equipos a la vez)
            # team_names = Fetcher.tba.get_team_names(tuple(team_strings))

            results = []
            for team_num_str in team_strings:
                # Combinamos las estadísticas para cada equipo
                combined_stats = (sb_stats_dict.get(team_num_str, {}) or {}) | (tba_stats_dict.get(team_num_str, {}) or {})
                
                # Filtramos metadatos que no queremos
                metrics = {k: v for k, v in combined_stats.items() if k not in ["team", "event"]}

                results.append({
                    "team_number": int(team_num_str),
                    "name": team_num_str,
                    "metrics": metrics,
                })
            
            return results

        except requests.exceptions.RequestException as e:
            print(f"Error fetching bulk data for event {event_key}: {e}")
            return None