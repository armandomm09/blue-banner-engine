import pandas as pd
from ..models.model_loader import loader
from ..third_parties.fetcher import Fetcher
from ..domain.prediction import MatchPrediction

class MatchpointPredictor:
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            
            cls._instance = super().__new__(cls)

        return cls._instance
    
    @staticmethod
    def get_match_prediction(match_key: str):
        features_dict = Fetcher.get_match_features(match_key)
        if not features_dict:
            raise ValueError(f"Could not fetch features for match {match_key}")
        
        features_df = pd.DataFrame([features_dict])

        win_probs = loader.classifier.predict_proba(features_df)[0]
        red_score = loader.red_regressor.predict(features_df)[0]
        blue_score = loader.blue_regressor.predict(features_df)[0]
        prob_red_win = win_probs[0]
        prob_blue_win = win_probs[1]
        predicted_winner = "blue" if prob_blue_win > prob_red_win else "red"

        prediction_result = MatchPrediction(
            match_key=match_key,
            predicted_winner=predicted_winner,
            win_probability={
                "red": round(float(prob_red_win), 4),
                "blue": round(float(prob_blue_win), 4)
            },
            predicted_scores={
                "red": int(round(red_score)),
                "blue": int(round(blue_score))
            }
        )
        
        return prediction_result