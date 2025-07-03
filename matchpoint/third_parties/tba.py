import requests
from ..config import TBA_BASE_URL, TBA_HEADER
import functools

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