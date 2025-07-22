import requests
from .tba import TBAService
from .statbotics import SBService
from ..config import TBA_BASE_URL, TBA_HEADER, FEATURE_ORDER
import functools
from typing import Dict, Any

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

            # Obtener stats de statbotics en paralelo para los 6 equipos
        
            all_teams = red_teams + blue_teams
            
            print("teams", tuple(all_teams))            
            sb_stats_dict = Fetcher.sb.get_all_sb_stats_for_event_concurrently(event_key, tuple(all_teams))
            tba_stats_dict = Fetcher.tba.get_all_tba_stats_for_event_concurrently(event_key, tuple(all_teams))
            for i in range(3):
                # Statbotics
                red_team = red_teams[i]
                blue_team = blue_teams[i]
                red_sb_stats = sb_stats_dict.get(red_team, {}) or {}
                blue_sb_stats = sb_stats_dict.get(blue_team, {}) or {}
                # TBA
                red_tba_stats = tba_stats_dict.get(red_team, {}) or {}
                blue_tba_stats = tba_stats_dict.get(blue_team, {}) or {}
                # Unir
                red_team_stats = red_sb_stats | red_tba_stats
                blue_team_stats = blue_sb_stats | blue_tba_stats

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
    
    @staticmethod
    @functools.lru_cache(maxsize=16) # Cachea los resultados para los 16 eventos más recientes
    def get_all_team_features_for_event(event_key: str) -> Dict[str, Dict[str, Any]]:
        """
        Obtiene de manera eficiente las características combinadas de TODOS los equipos de un evento.

        Este es el método preferido para el procesamiento por lotes, ya que minimiza
        las llamadas a la API y las organiza de forma concurrente.

        Returns:
            Un diccionario donde la clave es el número del equipo (str) y el valor
            es un diccionario con todas sus características (epa, opr, etc.).
            Ej: {'254': {'epa': 70.1, ...}, '1678': {'epa': 68.5, ...}}
        """
        print(f"--- Iniciando obtención de datos por lotes para todos los equipos en: {event_key} ---")
        try:
            # 1. Obtener la lista de todos los equipos en el evento
            req = requests.get(f"{TBA_BASE_URL}/event/{event_key}/teams/keys", headers=TBA_HEADER)
            req.raise_for_status()
            # Pasamos una tupla porque las listas no son "hashable" para el caché lru
            team_keys = tuple(key[3:] for key in req.json())

            # 2. Obtener todos los datos de las APIs en paralelo/lote
            #    - Statbotics se obtiene de forma concurrente.
            #    - TBA OPRs/COPRs se obtiene en dos llamadas de lote.
            all_sb_stats = Fetcher.sb.get_all_sb_stats_for_event_concurrently(event_key, team_keys)
            all_tba_stats = Fetcher.tba.get_all_tba_stats_for_event_concurrently(event_key, team_keys)

            # 3. Combinar los datos en un solo diccionario para búsquedas rápidas
            all_team_features = {}
            for team_key in team_keys:
                sb_stats = all_sb_stats.get(team_key, {}) or {}
                
                # Extraer los stats de TBA para este equipo específico del gran diccionario
                tba_stats = {
                    stat: data.get(f"frc{team_key}", 0.0)
                    for stat, data in all_tba_stats.items()
                }
                
                all_team_features[team_key] = sb_stats | tba_stats
            
            print(f"--- Datos obtenidos para {len(all_team_features)} equipos. ---")
            return all_team_features

        except requests.exceptions.RequestException as e:
            print(f"ERROR: Fallo de red obteniendo datos de equipos para {event_key}: {e}")
            return {}
        except KeyError as e:
            print(f"ERROR: Falta una clave obteniendo datos de equipos para {event_key}: {e}")
            return {}