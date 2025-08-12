import functools
import requests
from ..config import STATBOTICS_BASE_URL
from concurrent.futures import ThreadPoolExecutor, as_completed

class SBService:
    """
    A service class to interact with the Statbotics API and local CSV data.
    """
    
    def get_sb_team_stats_event_from_api(self, team: str, event_key: str) -> dict:
        """
        Fetches statistics for a specific team at a specific event from the Statbotics API.

        Args:
            team (str): The team number (e.g., '254').
            event_key (str): The event key (e.g., '2023cada').

        Raises:
            requests.ConnectionError: If the API request fails or returns a non-200 status code.
            KeyError: If the response JSON is missing expected keys.

        Returns:
            dict: A dictionary containing the team's statistics for the event.
        """
        try:
            url = f"{STATBOTICS_BASE_URL}/team_event/{str(team)}/{event_key[:4]}"
            req = requests.get(url)
            
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
        Fetches all Statbotics stats for a list of teams at an event concurrently.

        This method uses a thread pool to make multiple API requests in parallel,
        significantly speeding up data retrieval for an entire event. The results
        are cached.

        Args:
            event_key (str): The event key (e.g., '2023cada').
            team_keys (tuple[str]): A tuple of team numbers to fetch data for.

        Returns:
            dict: A dictionary mapping each team key to its fetched statistics.
        """
        all_team_stats = {}
        # Using a reasonable number of workers to avoid overwhelming the API.
        # 8 to 16 is usually a good starting point.
        MAX_WORKERS = 10 

        # print(f"Fetching Statbotics data for {len(team_keys)} teams using {MAX_WORKERS} workers...")

        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            # Create a future for each API call
            # Use a dictionary to map the future back to the team key
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
                    print(f"ERROR: Worker for team {team_key} generated an exception: {exc}")
        
        print("Statbotics data fetching complete.")
        return all_team_stats
        
    def get_sb_team_stats_event(self, team: str, event_key: str) -> dict:
        """
        Retrieves Statbotics stats for a team at an event from a local CSV file.

        The path to the CSV is determined by the 'TESTING' environment variable.

        Args:
            team (str): The team number.
            event_key (str): The event key (used for context in the returned dict).

        Raises:
            KeyError: If the team is not found in the CSV file.
            Exception: If there's an error reading or processing the CSV file.

        Returns:
            dict: A dictionary containing the team's statistics.
        """
        try:
            import pandas as pd
            import os
            
            # Determine the CSV path based on the TESTING environment variable
            testing = os.getenv('TESTING', 'true').lower() == 'true'
            if testing:
                csv_path = "/Users/armando/Progra/ai/bbe/matchpoint/data/dataset.csv"
            else:
                csv_path = "/app/matchpoint/data/dataset.csv"
            
            df = pd.read_csv(csv_path)
            
            team_data = df[df['num'] == int(team)]
            
            if team_data.empty:
                raise KeyError(f"Team {team} not found in CSV")
            
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
            print(f"Error reading CSV for team {team}, event {event_key}: {e}")
            raise KeyError(f"{e}")
    
    def get_all_sb_stats_for_event(self, event_key: str, team_keys: tuple[str]) -> dict:
        """
        Retrieves all Statbotics stats for a list of teams at an event from a local CSV.

        This method iterates through the provided team keys and fetches data for each
        one by one from the CSV file.

        Args:
            event_key (str): The event key.
            team_keys (tuple[str]): A tuple of team numbers to fetch data for.

        Returns:
            dict: A dictionary mapping each team key to its statistics from the CSV.
        """
        all_team_stats = {}
        
        # print(f"Fetching Statbotics data from CSV for {len(team_keys)} teams...")
        
        for team_key in team_keys:
            try:
                result = self.get_sb_team_stats_event(team_key, event_key)
                if result:
                    all_team_stats[team_key] = result
            except Exception as exc:
                print(f"ERROR: Could not get data for team {team_key}: {exc}")
        
        # print("Statbotics CSV data fetching complete.")
        return all_team_stats