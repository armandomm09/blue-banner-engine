import requests
import os
import base64
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Fallback: manually parse .env if python-dotenv is not installed
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    key, value = line.strip().split("=", 1)
                    os.environ[key] = value

class FTCDirectClient:
    """
    Python client to call the FIRST FTC API directly via ftc-events.firstinspires.org.
    """
    
    def __init__(self, api_key: Optional[str] = None, username: Optional[str] = None):
        self.api_key = api_key or os.getenv("FTC_API_KEY")
        self.username = username or os.getenv("FTC_USER")
        # Use the official API domain to avoid redirection (which can strip Auth headers)
        self.base_url = "https://ftc-api.firstinspires.org/v2.0"

    def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Any:
        if not self.api_key:
            print("Error: FTC_API_KEY not found in environment or constructor.")
            return None

        # Build the Basic Auth token
        # If we have a username, we must encode 'username:key'
        # If we don't have a username, we check if the key is already base64-ish
        # For FIRST API, it MUST be base64(username:key)
        if self.username:
            auth_str = f"{self.username}:{self.api_key}"
            token = base64.b64encode(auth_str.encode('ascii')).decode('ascii')
        else:
            # Fallback: If no username, maybe the key is already the base64 token
            # We'll try it as is, but warn the user.
            token = self.api_key
            if '-' in token:
                 print("\n--- WARNING ---")
                 print("FTC_API_KEY looks like a raw UUID but FTC_USER is missing.")
                 print("FTC API requires 'username:key' encoded in Base64.")
                 print("Please add 'FTC_USER=your_username' to your .env file.")
                 print("----------------\n")

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {
            "Authorization": f"Basic {token}",
            "Accept": "application/json",
            "User-Agent": "FTCDirectClient/1.0"
        }
        
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error: {e}")
            if response.text:
                print(f"Response Body: {response.text}")
            return None
        except Exception as e:
            print(f"Error: {e}")
            return None

    def get_event_matches(self, season: int, event_code: str) -> List[Dict[str, Any]]:
        """Retrieves the qualification match schedule (hybrid) for an FTC event."""
        data = self._get(f"/{season}/schedule/{event_code}/qual/hybrid")
        return data.get("schedule", []) if data else []

    def get_event_teams(self, season: int, event_code: str) -> List[Dict[str, Any]]:
        """Retrieves the list of teams attending an FTC event."""
        data = self._get(f"/{season}/teams", params={"eventCode": event_code})
        return data.get("teams", []) if data else []

    def get_team_matches(self, season: int, event_code: str, team_number: int) -> List[Dict[str, Any]]:
        """Retrieves qualification matches for a specific team at an event."""
        data = self._get(f"/{season}/schedule/{event_code}/qual/hybrid", params={"teamNumber": team_number})
        return data.get("schedule", []) if data else []

    def get_season_summary(self, season: int) -> Dict[str, Any]:
        """Retrieves a summary of the season."""
        return self._get(f"/{season}")

# --- EXAMPLES OF HOW TO CALL EACH FUNCTION ---

"""
# Initialize the client
# It will automatically look for FTC_API_KEY in your .env file
client = FTCDirectClient()

# 1. Get all teams at a 2023 event
# teams = client.get_event_teams(2023, "TXHOU")
# if teams:
#     print(f"First team found: {teams[0]['nameFull']} (#{teams[0]['teamNumber']})")

# 2. Get the match schedule for an event
# matches = client.get_event_matches(2023, "TXHOU")
# if matches:
#     print(f"Found {len(matches)} qualification matches")

# 3. Get matches for a specific team (e.g., Team 12345)
# team_matches = client.get_team_matches(2023, "TXHOU", 12345)
# for m in team_matches:
#     print(f"Match #{m['matchNumber']}: {m['description']}")

# 4. Get season information
# season_info = client.get_season_summary(2023)
# print(f"Season name: {season_info.get('gameName')}")
"""

if __name__ == "__main__":
    # Quick Test
    client = FTCDirectClient()
    
    # Change these to real values to test
    SEASON = 2025
    EVENT = "MXCMP"
    
    print(f"--- Testing FTC Direct Client for {SEASON} {EVENT} ---")
    
    # Try fetching teams as a test
    # teams = client.get_event_teams(SEASON, EVENT)
    # if teams:
    #     print(f"Success! Found {len(teams)} teams.")
    #     for team in teams[:3]: # Print first 3
    #         print(f"- {team['teamNumber']}: {team['nameShort']}")
    # else:
    #     print("Could not fetch teams. Check your FTC_API_KEY and event code.")

    team_matches = client.get_team_matches(SEASON, EVENT, 31661)
    if team_matches:
        print(f"Success! Found {len(team_matches)} matches for team 31661.")
        for match in team_matches[:3]: # Print first 3
            print(f"- {match['matchNumber']}: {match['description']}")
    else:
        print("Could not fetch matches. Check your FTC_API_KEY and event code.")
        print(team_matches)
