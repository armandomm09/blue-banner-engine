import requests
from ..config import TBA_BASE_URL, TBA_HEADER
import functools
from concurrent.futures import ThreadPoolExecutor, as_completed

class TBAService:
    """
    A service class for interacting with The Blue Alliance (TBA) API.
    """
    
    @staticmethod
    def get_tba_oprs_event(event_key: str) -> dict:
        """
        Fetches OPRs (Offensive Power Rating) and component OPRs for an entire event.

        Args:
            event_key (str): The event key (e.g., '2023cada').

        Raises:
            KeyError: If the response from TBA is missing expected keys.

        Returns:
            dict: A dictionary containing various OPRs and COPRs for the event.
        """
        try:
            req = requests.get(f"{TBA_BASE_URL}/event/{event_key}/oprs", TBA_HEADER)
            req.raise_for_status()
            oprs_res = req.json()
            
            # This endpoint for COPRs might be specific to certain years (e.g., 2024)
            req = requests.get(
                f"{TBA_BASE_URL}/event/{event_key}/coprs",
                TBA_HEADER,
            )
            req.raise_for_status()
            coprs_res = req.json()

            final_oprs = {
                "opr": oprs_res.get('oprs', {}), 
                "ccwm": oprs_res.get('ccwms', {}),
                "l3_count": coprs_res.get("L3 Coral Count", {}), 
                "l4_count": coprs_res.get("L4 Coral Count", {}),
                "coral_count": coprs_res.get("Total Coral Count", {}),
                "algae_count": coprs_res.get("Total Algae Count", {})
            }
            
            return final_oprs
        except requests.ConnectionError as e:
            print(e)
            return {}
        except KeyError as e:
            raise KeyError(f"Key Error fetching TBA stats {event_key}\n{e}")
    
    @staticmethod 
    @functools.lru_cache(maxsize=64)
    def get_tba_oprs_team_event(team: str, event_key: str) -> dict:
        """
        Extracts TBA OPR stats for a single team from the event-wide OPR data.

        This method is cached to avoid refetching data for the same team-event pair.

        Args:
            team (str): The team number (e.g., '254').
            event_key (str): The event key (e.g., '2023cada').

        Returns:
            dict: A dictionary of team-specific OPR stats.
        """
        team = str(team)
        oprs_info = TBAService.get_tba_oprs_event(event_key)
        
        team_specific_stats = {}
        
        for opr_name, team_data in oprs_info.items():
            team_specific_stats[opr_name] = team_data.get(f"frc{team}", 0.0) # Default to 0.0 if not found
            
        return team_specific_stats
    
    @staticmethod
    def get_event_week(event_key: str) -> int | None:
        """
        Fetches the competition week number for a given event.

        Args:
            event_key (str): The event key.

        Returns:
            int | None: The week number (0 for Week 1, etc.) or None on error.
        """
        try:
            req = requests.get(f"{TBA_BASE_URL}/event/{event_key}", TBA_HEADER)
            req.raise_for_status()
            res = req.json()
            return res.get('week')
        except requests.ConnectionError as e:
            print(f"Error fetching {event_key} week:\n{e}")
            return None
    
    @staticmethod
    def get_alliances(event_key: str):
        """
        Fetches the already made alliances for a given event
        
        Args:
            event_key (str): The event key 
            
        Returns: 
            tuple[str]: A flattened tuple of all the teams in the event's playoff
            list[list[str]]: A list containing lists of each alliance's team numbers

        """
        try:
            req = requests.get(f"{TBA_BASE_URL}/event/{event_key}/alliances", TBA_HEADER)
            
            res = req.json()
            alliances_numbers = []
            for  alliance in res:
                alliances_numbers.append(alliance["picks"][0:3])
                
            for i, numbers in enumerate(alliances_numbers): 
                for j, team in enumerate(numbers):
                    alliances_numbers[i][j] = int(alliances_numbers[i][j][3:])
            return tuple(sum(alliances_numbers, [])), alliances_numbers
        except requests.ConnectionError as e:
            raise e
            
    @functools.lru_cache(maxsize=32)
    def get_all_tba_stats_for_event_concurrently(self, event_key: str, team_keys: tuple[str]) -> dict:
        """
        Fetches all TBA stats for a list of teams at an event concurrently.

        Uses a thread pool to make multiple API requests in parallel. The results
        are cached based on the event key and team keys.

        Args:
            event_key (str): The event key.
            team_keys (tuple[str]): A tuple of team numbers to fetch data for.

        Returns:
            dict: A dictionary mapping each team key to its fetched TBA statistics.
        """
        all_team_stats = {}
        MAX_WORKERS = 20 

        print(f"Fetching TBA data for {len(team_keys)} teams using {MAX_WORKERS} workers...")
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            # Create a future for each API call
            # Use a dictionary to map the future back to the team key
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
                    print(f"ERROR: Worker for team {team_key} generated an exception: {exc}")
        
        print("TBA data fetching complete.")
        return all_team_stats