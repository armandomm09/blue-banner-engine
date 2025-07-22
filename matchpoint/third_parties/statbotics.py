import functools
import requests
from ..config import STATBOTICS_BASE_URL
from concurrent.futures import ThreadPoolExecutor, as_completed


class SBService:
        
    def get_sb_team_stats_event(self, team, event_key):
        
        try:
            req = requests.get(f"{STATBOTICS_BASE_URL}/team_year/{str(team)}/{event_key[:4]}")
            
            team_dict = req.json()
            
            team_info = {
                "event": event_key,
                "team": team_dict["team"],
                "epa": team_dict["epa"]["norm"],
                "total_points": team_dict["epa"]["breakdown"]["total_points"],
                "auto_points": team_dict["epa"]["breakdown"]["auto_points"],
                "teleop_points": team_dict["epa"]["breakdown"]["teleop_points"],
                "endgame_points": team_dict["epa"]["breakdown"]["endgame_points"],
                "winrate": team_dict["record"]["winrate"],
                "rank": team_dict["epa"]["ranks"]["total"]["rank"],
                
                }
            
            return team_info
        except requests.ConnectionError as e:
            print(e)
        except KeyError as e:
            raise KeyError(f"Key Error fetching statbotics stats\n{team}, {event_key}\n{e}")
        
    @functools.lru_cache(maxsize=32)
    def get_all_sb_stats_for_event_concurrently(self, event_key: str, team_keys: tuple[str]) -> dict:
        """
        Obtiene TODOS los stats de Statbotics para una lista de equipos de un evento
        de manera concurrente usando multithreading.
        """
        all_team_stats = {}
        # Usamos un número razonable de workers para no sobrecargar la API
        # entre 8 y 16 suele ser un buen punto de partida.
        MAX_WORKERS = 10 

        print(f"Fetching Statbotics data for {len(team_keys)} teams using {MAX_WORKERS} workers...")

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            # Creamos un futuro para cada llamada a la API
            # Usamos un diccionario para poder asociar el futuro con la clave del equipo
            future_to_team = {
                executor.submit(self.get_sb_team_stats_event, team_key, event_key): team_key
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
        
        print("Statbotics data fetching complete.")
        return all_team_stats
        
        