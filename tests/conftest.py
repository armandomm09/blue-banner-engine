"""
Pytest configuration and fixtures for BBE testing
"""
import pytest
import sys
from pathlib import Path

# Add project paths to sys.path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


@pytest.fixture
def sample_event_key():
    """Fixture providing a sample event key"""
    return "2025mxle"


@pytest.fixture
def sample_match_key():
    """Fixture providing a sample match key"""
    return "2025mxle_f1m1"


@pytest.fixture
def sample_team_numbers():
    """Fixture providing sample team numbers"""
    return [1690, 3476, 5800]


@pytest.fixture
def sample_prediction_data():
    """Fixture providing sample prediction data"""
    return {
        "match_key": "2025mxle_f1m1",
        "blue_alliance": [1690, 3476, 5800],
        "red_alliance": [2910, 4414, 5010],
        "predicted_winner": "blue",
        "confidence": 0.87,
        "breakdown": {
            "blue_score": 156,
            "red_score": 142,
            "blue_rp": 2,
            "red_rp": 0
        }
    }


@pytest.fixture
def sample_team_metrics():
    """Fixture providing sample team metrics"""
    return {
        "team_number": 1690,
        "event_key": "2025mxle",
        "matches_played": 12,
        "average_score": 98.5,
        "average_rp": 1.8,
        "win_rate": 0.75,
        "recent_performance": [100, 95, 110, 92, 88]
    }


@pytest.fixture
def sample_playoff_bracket():
    """Fixture providing a sample playoff bracket structure"""
    return {
        "event_key": "2025mxle",
        "match_level": "f",
        "teams": [1690, 3476, 5800, 2910, 4414, 5010, 1234, 5678],
        "match_structure": {
            "semifinals": {
                "1": {"blue": [1690, 3476, 5800], "red": [2910, 4414, 5010]},
                "2": {"blue": [1234, 5678, 9999], "red": [8888, 7777, 6666]}
            },
            "finals": {
                "1": {"blue": [], "red": []}
            }
        }
    }


@pytest.fixture
def mock_grpc_client():
    """Fixture providing a mock gRPC client"""
    from unittest.mock import MagicMock
    return MagicMock()


@pytest.fixture
def mock_tba_api_key():
    """Fixture providing a mock TBA API key"""
    return "test-tba-api-key-12345"


@pytest.fixture
def mock_grpc_server_address():
    """Fixture providing a mock gRPC server address"""
    return "localhost:50051"
