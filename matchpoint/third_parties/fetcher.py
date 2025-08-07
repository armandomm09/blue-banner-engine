import requests
from .tba import TBAService
from .statbotics import SBService
from ..config import TBA_BASE_URL, TBA_HEADER, FEATURE_ORDER
import functools
from typing import Dict, Any

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
    def get_match_features(match_key: str) -> dict | None:
        """
        Fetches and compiles a feature set for a specific match.

        This method retrieves team information for a given match, fetches statistics
        for each participating team from both Statbotics and TBA, combines them,
        and then orders them according to the FEATURE_ORDER constant.

        Args:
            match_key (str): The key for the match (e.g., '2023cada_qm1').

        Returns:
            dict | None: A dictionary with ordered features for the match. 
                        Returns None if an error occurs during data fetching
                        or processing.
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

            event_week = Fetcher.tba.get_event_week(event_key)

            raw_features = {}
            raw_features['week'] = 8 if event_week is None else event_week
            
            all_teams = red_teams + blue_teams
            
            print("teams", tuple(all_teams))            
            sb_stats_dict = Fetcher.sb.get_all_sb_stats_for_event(event_key, tuple(all_teams))
            tba_stats_dict = Fetcher.tba.get_all_tba_stats_for_event_concurrently(event_key, tuple(all_teams))

            for i in range(3):
                red_team = red_teams[i]
                blue_team = blue_teams[i]
                
                # Combine Statbotics and TBA stats for each team
                red_team_stats = (sb_stats_dict.get(red_team, {}) or {}) | (tba_stats_dict.get(red_team, {}) or {})
                blue_team_stats = (sb_stats_dict.get(blue_team, {}) or {}) | (tba_stats_dict.get(blue_team, {}) or {})

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

            return ordered_match_features

        except requests.exceptions.RequestException as e:
            print(f"Error fetching data for match {match_key}: {e}")
            return None
        except KeyError as e:
            print(
                f"Error processing match {match_key}. Missing team or key?: {e}"
            )
            return None
    
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
          req = requests.get(f"{TBA_BASE_URL}/event/{event_key}/teams/keys", headers=TBA_HEADER)
          req.raise_for_status()
          
          # Creates a tuple of team numbers (e.g., ('254', '1114', ...))
          team_keys = tuple(key[3:] for key in req.json())

          all_sb_stats = Fetcher.sb.get_all_sb_stats_for_event(event_key, team_keys)
          all_tba_stats = Fetcher.tba.get_all_tba_stats_for_event_concurrently(event_key, team_keys)

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