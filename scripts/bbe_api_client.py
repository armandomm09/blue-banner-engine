import requests
import json
from typing import List, Dict, Any, Optional

class BBEApiClient:
    """
    Python client for the Blue Banner Engine (BBE) API.
    Provides access to TBA, FTC, Statbotics, and ML prediction data.
    """
    
    def __init__(self, base_url: str = "http://localhost:8080/api/v1"):
        self.base_url = base_url.rstrip('/')

    def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error: {e}")
            if response.text:
                print(f"Response: {response.text}")
            return None
        except Exception as e:
            print(f"Error: {e}")
            return None

    # --- TBA (The Blue Alliance) Proxied Endpoints ---

    def get_tba_events(self, year: int) -> List[Dict[str, Any]]:
        """Retrieves a simplified list of all FRC events for a given year."""
        return self._get(f"events/{year}")

    def get_tba_event_teams(self, event_key: str) -> List[str]:
        """Retrieves a list of all team keys participating in a given FRC event."""
        return self._get(f"events/teams/{event_key}")

    def get_tba_team_metrics(self, team_number: int, event_key: str) -> Dict[str, Any]:
        """Fetches rankings and OPRs for a team at a specific event."""
        return self._get(f"tba/team/{team_number}/metrics", params={"eventKey": event_key})

    def get_tba_event_schedule(self, event_key: str) -> List[Dict[str, Any]]:
        """Retrieves the match schedule for an FRC event."""
        return self._get(f"tba/event/{event_key}/schedule")

    def get_tba_team_event_matches(self, event_key: str, team_number: int) -> List[Dict[str, Any]]:
        """Retrieves matches for a specific team at an FRC event."""
        return self._get(f"tba/event/{event_key}/team/{team_number}/matches")

    # --- FTC (First Tech Challenge) Proxied Endpoints ---

    def get_ftc_event_matches(self, season: int, event_code: str) -> List[Dict[str, Any]]:
        """Retrieves the match schedule for an FTC event."""
        return self._get(f"ftc/event/{season}/{event_code}/matches")

    def get_ftc_event_teams(self, season: int, event_code: str) -> List[Dict[str, Any]]:
        """Retrieves the list of teams at an FTC event."""
        return self._get(f"ftc/event/{season}/{event_code}/teams")

    def get_ftc_team_matches(self, season: int, event_code: str, team_number: int) -> List[Dict[str, Any]]:
        """Retrieves matches for a specific team at an FTC event."""
        return self._get(f"ftc/event/{season}/{event_code}/team/{team_number}/matches")

    # --- ML Prediction Endpoints ---

    def get_predictions_event(self, event_key: str) -> Dict[str, Any]:
        """Retrieves all match predictions for a given FRC event key."""
        return self._get(f"predict/event/{event_key}")

    def get_prediction_match(self, match_key: str) -> Dict[str, Any]:
        """Retrieves a detailed prediction for a single FRC match, including SHAP analysis."""
        return self._get(f"predict/match/{match_key}")

    # --- Statbotics Proxied Endpoints ---

    def get_statbotics_metrics(self, team_number: int, year: Optional[int] = None) -> Dict[str, Any]:
        """Fetches EPA and other metrics from Statbotics for a specific team and year."""
        params = {"year": year} if year else {}
        return self._get(f"statbotics/team/{team_number}/metrics", params=params)

    # --- Metrics Metadata Endpoints ---

    def get_metrics_metadata(self) -> List[Dict[str, Any]]:
        """Returns a list of all available metrics for visualization metadata."""
        return self._get("metrics/metadata")


# --- EXAMPLES OF HOW TO USE THE FUNCTIONS ---

"""
# Initialize the client
client = BBEApiClient(base_url="https://bbe-frc.com/api/v1")

# 1. Get all events for 2024
# events_2024 = client.get_tba_events(2024)
# print(json.dumps(events_2024[:2], indent=2))

# 2. Get teams at a specific FRC event
# teams = client.get_tba_event_teams("2024mxmo")
# print(f"Teams in Monterrey: {teams}")

# 3. Get predictions for a full FRC event
# predictions = client.get_predictions_event("2024mxle")
# print(f"Found {len(predictions.get('predictions', []))} predictions")

# 4. Get a detailed prediction for a single match (with SHAP analysis)
# match_detail = client.get_prediction_match("2024mxmo_qm1")
# print(f"Winner: {match_detail.get('predicted_winner')}")

# 5. Get Statbotics metrics for Team 254 in 2024
# stat_metrics = client.get_statbotics_metrics(254, 2024)
# print(f"EPA: {stat_metrics.get('epa')}")

# 6. Get FTC event data
# ftc_teams = client.get_ftc_event_teams(2023, "TXHOU")
# print(f"FTC Teams: {len(ftc_teams)}")

# 7. Get available metrics for dashboards
# metadata = client.get_metrics_metadata()
# print(f"Available metrics: {[m['name'] for m in metadata]}")
"""

if __name__ == "__main__":
    # Example execution (assuming local server is running)
    client = BBEApiClient()
    events_2024 = client.get_tba_events(2024)
    print(events_2024)
    # print(json.dumps(events_2024[:2], indent=2))
    # Uncomment an example below to run it
    # print(client.get_metrics_metadata())
