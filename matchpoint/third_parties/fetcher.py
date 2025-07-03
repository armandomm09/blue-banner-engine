import requests
from .tba import TBAService
from .statbotics import SBService
from ..config import TBA_BASE_URL, TBA_HEADER, FEATURE_ORDER


class Fetcher:
    
    sb = SBService()
    tba = TBAService()
    
    @staticmethod
    def get_match_features(match_key: str) -> dict:

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

            for i in range(3):
                
                red_team_stats = Fetcher.get_team_features(red_teams[i], event_key)
                blue_team_stats = Fetcher.get_team_features(blue_teams[i], event_key)

                for stat_name, value in red_team_stats.items():

                    if stat_name not in ["team", "event"]:
                        raw_features[f"red{i+1}_{stat_name}"] = value

                for stat_name, value in blue_team_stats.items():
                    if stat_name not in ["team", "event"]:
                        raw_features[f"blue{i+1}_{stat_name}"] = value

            ordered_match_features = {
                feature: raw_features.get(feature, 0.0) for feature in FEATURE_ORDER
            }

            return ordered_match_features

        except requests.exceptions.RequestException as e:
            print(f"Error obteniendo datos para el partido {match_key}: {e}")
            return None
        except KeyError as e:
            print(
                f"Error procesando el partido {match_key}. ¿Falta un equipo o una clave?: {e}"
            )
            return None
    
    @staticmethod
    def get_team_features(team, event_key):
        team = str(team)
        sb_stats = Fetcher.sb.get_sb_team_stats_event(team, event_key)
        
        tba_stats = Fetcher.tba.get_tba_oprs_team_event(team, event_key)
        
        return sb_stats | tba_stats