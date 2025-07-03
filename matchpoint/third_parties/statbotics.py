import requests
from ..config import STATBOTICS_BASE_URL

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
        
        