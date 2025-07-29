import functools
import requests
from ..config import STATBOTICS_BASE_URL
from concurrent.futures import ThreadPoolExecutor, as_completed


class SBService:
    
    def get_sb_team_stats_event_from_api(self, team, event_key):
        
        try:
            url = f"{STATBOTICS_BASE_URL}/team_event/{str(team)}/{event_key[:4]}"
            req = requests.get(url)
            
            #Check status code
            if req.status_code != 200:
                raise requests.ConnectionError(f"\nError fetching statbotics stats {team}, {event_key}\nStatus code: {req.status_code}")
            
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
            raise requests.ConnectionError(f"{e}")
        except KeyError as e:
            print(f"Key Error fetching statbotics stats {team}, {event_key}\n")
            raise KeyError(f"{e}")
        
    @functools.lru_cache(maxsize=32)
    def get_all_sb_stats_for_event_concurrently_from_api(self, event_key: str, team_keys: tuple[str]) -> dict:
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
                executor.submit(self.get_sb_team_stats_event_from_api, team_key, event_key): team_key
                for team_key in team_keys
            }

            for future in as_completed(future_to_team):
                team_key = future_to_team[future]
                try:
                    result = future.result()
                    if result:
                        all_team_stats[team_key] = result
                except Exception as exc:
                    # raise Exception(f"ERROR: El worker para el equipo {team_key} generó una excepción: {exc}")
                    print(f"ERROR: El worker para el equipo {team_key} generó una excepción: {exc}")
        
        print("Statbotics data fetching complete.")
        return all_team_stats
        
    def get_sb_team_stats_event(self, team, event_key):
        """
        Obtiene los stats de Statbotics para un equipo en un evento desde el CSV.
        """
        try:
            import pandas as pd
            import os
            
            # Determinar la ruta del CSV según la variable de entorno TESTING
            testing = os.getenv('TESTING', 'true').lower() == 'true'
            if testing:
                csv_path = "/Users/armando/Progra/ai/bbe/matchpoint/data/dataset.csv"
            else:
                csv_path = "/app/matchpoint/data/dataset.csv"
            
            df = pd.read_csv(csv_path)
            
            team_data = df[df['num'] == int(team)]
            
            if team_data.empty:
                raise KeyError(f"No se encontró el equipo {team} en el CSV")
            
            row = team_data.iloc[0]
            
            team_info = {
                "event": event_key,
                "team": int(row['num']),
                "epa": float(row['norm_epa']) if pd.notna(row['norm_epa']) else None,
                "total_points": float(row['total_epa']) if pd.notna(row['total_epa']) else None,
                "auto_points": float(row['auto_epa']) if pd.notna(row['auto_epa']) else None,
                "teleop_points": float(row['teleop_epa']) if pd.notna(row['teleop_epa']) else None,
                "endgame_points": float(row['endgame_epa']) if pd.notna(row['endgame_epa']) else None,
                "winrate": float(row['winrate']) if pd.notna(row['winrate']) else None,
                "rank": int(row["epa_rank"]) if pd.notna(row["epa_rank"]) else None
            }
            
            return team_info
            
        except Exception as e:
            print(f"Error al leer el CSV para equipo {team}, evento {event_key}: {e}")
            raise KeyError(f"{e}")
    
    def get_all_sb_stats_for_event(self, event_key: str, team_keys: tuple[str]) -> dict:
        """
        Obtiene TODOS los stats de Statbotics para una lista de equipos de un evento desde el CSV.
        """
        all_team_stats = {}
        
        print(f"Fetching Statbotics data from CSV for {len(team_keys)} teams...")
        
        for team_key in team_keys:
            try:
                result = self.get_sb_team_stats_event(team_key, event_key)
                if result:
                    all_team_stats[team_key] = result
            except Exception as exc:
                print(f"ERROR: No se pudo obtener datos para el equipo {team_key}: {exc}")
        
        print("Statbotics CSV data fetching complete.")
        return all_team_stats
        
        