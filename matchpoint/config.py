# bbe_predictor/config.py
import os
from dotenv import load_dotenv

load_dotenv()

# API Config
TBA_API_KEY = os.getenv("TBA_API_KEY")
TBA_BASE_URL = "https://www.thebluealliance.com/api/v3"
STATBOTICS_BASE_URL = "https://api.statbotics.io/v3"
TBA_HEADER = {"X-TBA-Auth-Key": TBA_API_KEY}

# Model Config
MODEL_PATH = "/Users/armando/Progra/ai/bbe/matchpoint/models/models"
CLASSIFIER_PATH = os.path.join(MODEL_PATH, "classification.json")
RED_REGRESSOR_PATH = os.path.join(MODEL_PATH, "red_model.json")
BLUE_REGRESSOR_PATH = os.path.join(MODEL_PATH, "blue_model.json")


FEATURE_ORDER = [
    'week',
    'red3_epa', 'red2_epa', 'red1_epa',
    'blue3_epa', 'blue2_epa', 'blue1_epa',
    'red3_total_points', 'red2_total_points', 'red1_total_points',
    'blue3_total_points', 'blue2_total_points', 'blue1_total_points',
    'red3_auto_points', 'red2_auto_points', 'red1_auto_points',
    'blue3_auto_points', 'blue2_auto_points', 'blue1_auto_points',
    'red3_teleop_points', 'red2_teleop_points', 'red1_teleop_points',
    'blue3_teleop_points', 'blue2_teleop_points', 'blue1_teleop_points',
    'red3_endgame_points', 'red2_endgame_points', 'red1_endgame_points',
    'blue3_endgame_points', 'blue2_endgame_points', 'blue1_endgame_points',
    'red3_rank', 'red2_rank', 'red1_rank',
    'blue3_rank', 'blue2_rank', 'blue1_rank',
    'red3_winrate', 'red2_winrate', 'red1_winrate',
    'blue3_winrate', 'blue2_winrate', 'blue1_winrate',
    'red3_coral_count', 'red2_coral_count', 'red1_coral_count',
    'blue3_coral_count', 'blue2_coral_count', 'blue1_coral_count',
    'red3_l4_count', 'red2_l4_count', 'red1_l4_count',
    'blue3_l4_count', 'blue2_l4_count', 'blue1_l4_count',
    'red3_l3_count', 'red2_l3_count', 'red1_l3_count',
    'blue3_l3_count', 'blue2_l3_count', 'blue1_l3_count',
    'red3_algae_count', 'red2_algae_count', 'red1_algae_count',
    'blue3_algae_count', 'blue2_algae_count', 'blue1_algae_count',
    'red3_opr', 'red2_opr', 'red1_opr',
    'blue3_opr', 'blue2_opr', 'blue1_opr',
    'red3_ccwm', 'red2_ccwm', 'red1_ccwm',
    'blue3_ccwm', 'blue2_ccwm', 'blue1_ccwm'
]