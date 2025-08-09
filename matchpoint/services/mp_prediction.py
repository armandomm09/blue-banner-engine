from typing import List, Optional
import pandas as pd
import requests
from ..models.model_loader import loader
from ..third_parties.fetcher import Fetcher
from ..domain.prediction import MatchPrediction
from ..config import FEATURE_ORDER, TBA_HEADER
from .analysis.shap_analyzer import ShapAnalyzer

class MatchpointPredictor:
    """
    A singleton class responsible for generating match predictions.
    
    It orchestrates data fetching, feature engineering, model prediction,
    and results analysis.
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @staticmethod
    def get_match_prediction(match_key: str) -> Optional[MatchPrediction]:
        """
        Predicts a single match and calculates its SHAP analysis.

        Args:
            match_key (str): The key for the match to predict (e.g., '2023cada_qm1').

        Raises:
            ValueError: If features for the match could not be fetched.

        Returns:
            Optional[MatchPrediction]: A data object containing the prediction,
                                       probabilities, scores, and SHAP analysis.
        """
        features_dict = Fetcher.get_match_features(match_key)
        if not features_dict:
            raise ValueError(f"Could not fetch features for match {match_key}")
        
        features_df = pd.DataFrame([features_dict])

        # Predictions
        win_probs = loader.classifier.predict_proba(features_df)[0]
        red_score = loader.red_regressor.predict(features_df)[0]
        blue_score = loader.blue_regressor.predict(features_df)[0]
        
        # SHAP Analysis
        shap_result = ShapAnalyzer.get_shap_analysis(features_df)
        
        # Assemble result
        prob_red_win, prob_blue_win = win_probs[0], win_probs[1]
        predicted_winner = "blue" if prob_blue_win > prob_red_win else "red"

        return MatchPrediction(
            match_key=match_key,
            predicted_winner=predicted_winner,
            win_probability={"red": round(float(prob_red_win), 4), "blue": round(float(prob_blue_win), 4)},
            predicted_scores={"red": int(round(red_score)), "blue": int(round(blue_score))},
            shap_analysis=shap_result
        )
        
    def predict_match_by_features(self, features, shap: bool=False) -> MatchPrediction:
        """
        Predicts a match given specific match features
        
        Args:
            features dict: A dictionary containing the inference-ready features for prediction
            shab bool: Whether return the prediction come with shap analysis or no
            
        Returns:
            MatchPrediction: A MatchPrediction object containing info about the inference
        """
        features_df = pd.DataFrame([features])

        # Predictions
        win_probs = loader.classifier.predict_proba(features_df)[0]
        red_score = loader.red_regressor.predict(features_df)[0]
        blue_score = loader.blue_regressor.predict(features_df)[0]
        
        prob_red_win, prob_blue_win = win_probs[0], win_probs[1]
        predicted_winner = "blue" if prob_blue_win > prob_red_win else "red"
        
        mp = MatchPrediction(
            match_key="x_match",
            predicted_winner=predicted_winner,
            win_probability={"red": round(float(prob_red_win), 4), "blue": round(float(prob_blue_win), 4)},
            predicted_scores={"red": int(round(red_score)), "blue": int(round(blue_score))},
        )
        
        if shap:
            mp.shap_analysis = ShapAnalyzer.get_shap_analysis(features_df)
            
        return mp
    
    def predict_all_matches_for_event(self, event_key: str) -> List[MatchPrediction]:
        """
        Efficiently fetches, processes, and predicts all matches for an event.
        
        This method follows a multi-phase approach for efficiency:
        1. Batch Data Fetching: Gets all team data for the event in one go.
        2. In-Memory Assembly: Constructs feature sets for all matches locally.
        3. Batch Prediction: Runs models on the complete feature DataFrame at once.
        4. Result Formatting: Assembles the prediction results into a list.

        Args:
            event_key (str): The key for the event (e.g., '2023cada').

        Returns:
            List[MatchPrediction]: A list of prediction objects for each valid match.
        """
        
        # --- Phase 1: Batch Data Fetching ---
        # Call our function to get all team data at once.
        all_team_features = Fetcher.get_all_team_features_for_event(event_key)
        if not all_team_features:
            print("Could not fetch team features, aborting prediction.")
            return []

        # Get the list of all matches for the event
        try:
            req = requests.get(f"https://www.thebluealliance.com/api/v3/event/{event_key}/matches/simple", headers=TBA_HEADER)
            req.raise_for_status()
            all_matches = req.json()
            event_week = Fetcher.tba.get_event_week(event_key)
        except requests.exceptions.RequestException as e:
            print(f"ERROR: Could not fetch matches for event {event_key}: {e}")
            return []

        # --- Phase 2: In-Memory Feature Assembly ---
        features_list = []
        valid_matches_for_prediction = [] # Store matches we could process

        for match in all_matches:
            # Optional: filter only qualification matches
            # if match.get('comp_level') != 'qm':
            #     continue

            try:
                raw_features = {'week': 8 if event_week is None else event_week}
                
                red_teams = [team[3:] for team in match['alliances']['red']['team_keys']]
                blue_teams = [team[3:] for team in match['alliances']['blue']['team_keys']]

                for i in range(3):
                    # Dictionary lookups (instantaneous), not API calls
                    red_team_stats = all_team_features[red_teams[i]]
                    blue_team_stats = all_team_features[blue_teams[i]]

                    for stat_name, value in red_team_stats.items():
                        if stat_name not in ["team", "event"]:
                            raw_features[f"red{i+1}_{stat_name}"] = value
                    for stat_name, value in blue_team_stats.items():
                        if stat_name not in ["team", "event"]:
                            raw_features[f"blue{i+1}_{stat_name}"] = value
                
                ordered_features = {feat: raw_features.get(feat, 0.0) for feat in FEATURE_ORDER}
                features_list.append(ordered_features)
                valid_matches_for_prediction.append(match)
            except KeyError as e:
                print(f"WARN: Skipping match {match.get('key')} due to missing team data: {e}")
        
        if not features_list:
            print("Could not assemble features for any match.")
            return []
            
        # --- Phase 3: Batch Prediction ---
        features_df = pd.DataFrame(features_list)
        
        # Call .predict() once for each model on the entire DataFrame
        all_win_probs = loader.classifier.predict_proba(features_df)
        all_red_scores = loader.red_regressor.predict(features_df)
        all_blue_scores = loader.blue_regressor.predict(features_df)
        
        # --- Phase 4: Formatting Results ---
        predictions = []
        for i, match in enumerate(valid_matches_for_prediction):
            prob_red_win, prob_blue_win = all_win_probs[i]
            predicted_winner = "blue" if prob_blue_win > prob_red_win else "red"
            
            prediction_obj = MatchPrediction(
                match_key=match['key'],
                predicted_winner=predicted_winner,
                win_probability={"red": round(float(prob_red_win), 4), "blue": round(float(prob_blue_win), 4)},
                predicted_scores={"red": int(round(all_red_scores[i])), "blue": int(round(all_blue_scores[i]))}
            )
            predictions.append(prediction_obj)
            
        return predictions