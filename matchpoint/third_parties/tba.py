import requests
from ..config import TBA_BASE_URL, TBA_HEADER
import functools
from concurrent.futures import ThreadPoolExecutor, as_completed

class TBAService:
    
    @staticmethod
    def get_tba_oprs_event(event_key):
        try:
            req = requests.get(f"{TBA_BASE_URL}/event/{event_key}/oprs", TBA_HEADER)
            
            oprs_res = req.json()
            
            req = requests.get(
                f"{TBA_BASE_URL}/event/{event_key}/coprs",
                TBA_HEADER,
            )

            coprs_res = req.json()
            final_oprs = {}
            final_oprs = {
                "opr": oprs_res['oprs'], 
                "ccwm": oprs_res['ccwms'],
                "l3_count": coprs_res["L3 Coral Count"], 
                "l4_count": coprs_res["L4 Coral Count"],
                "coral_count": coprs_res["Total Coral Count"],
                "algae_count": coprs_res["Total Algae Count"]
                }
            
            return final_oprs
        except requests.ConnectionError as e:
            print(e)
        except KeyError as e:
            raise KeyError(f"Key Error fetching TBA stats {event_key}\n{e}")
    
    @staticmethod 
    @functools.lru_cache(maxsize=64)
    def get_tba_oprs_team_event(team, event_key):
        team = str(team)
        oprs_info = TBAService.get_tba_oprs_event(event_key)
        
        team_specific_stats = {}
        
        for opr in oprs_info.keys():
            team_specific_stats[opr] = oprs_info[opr][f"frc{str(team)}"]
            
        return team_specific_stats
    
    @staticmethod
    def get_event_week(event_key):
        try:
            req = requests.get(f"{TBA_BASE_URL}/event/{event_key}", TBA_HEADER)
            
            res = req.json()
            
            return res['week']
        except requests.ConnectionError as e:
            print(f"Error fetching {event_key} week:\n{e}")
            
    # Get all teams in an event concurrently
    @functools.lru_cache(maxsize=32)
    def get_all_tba_stats_for_event_concurrently(self, event_key: str, team_keys: tuple[str]) -> dict:
        """
        Obtiene TODOS los stats de TBA para una lista de equipos de un evento
        de manera concurrente usando multithreading.
        """
        all_team_stats = {}
        MAX_WORKERS = 10 

        print(f"Fetching TBA data for {len(team_keys)} teams using {MAX_WORKERS} workers...")
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            # Creamos un futuro para cada llamada a la API
            # Usamos un diccionario para poder asociar el futuro con la clave del equipo
            future_to_team = {
                executor.submit(self.get_tba_oprs_team_event, team_key, event_key): team_key
                for team_key in team_keys
            }
            
            for future in as_completed(future_to_team):
                team_key = future_to_team[future]
                try:
                    result = future.result()
                    if result:
                        all_team_stats[team_key] = result
                except Exception as exc:
                    print(f"ERROR: El worker para el equipo {team_key} generó una excepción: {exc}")
        
        print("TBA data fetching complete.")
        return all_team_stats