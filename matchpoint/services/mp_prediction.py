from typing import List, Optional
import pandas as pd
import requests
from ..models.model_loader import loader
from ..third_parties.fetcher import Fetcher
from ..domain.prediction import MatchPrediction
from ..config import FEATURE_ORDER, TBA_HEADER
from .analysis.shap_analyzer import ShapAnalyzer

class MatchpointPredictor:
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            
            cls._instance = super().__new__(cls)

        return cls._instance
    
    @staticmethod
    def get_match_prediction( match_key: str) -> Optional[MatchPrediction]:
        """Predice un solo partido y calcula su análisis SHAP."""
        features_dict = Fetcher.get_match_features(match_key)
        if not features_dict:
            raise ValueError(f"Could not fetch features for match {match_key}")
        
        features_df = pd.DataFrame([features_dict])

        # Predicciones
        win_probs = loader.classifier.predict_proba(features_df)[0]
        red_score = loader.red_regressor.predict(features_df)[0]
        blue_score = loader.blue_regressor.predict(features_df)[0]
        
        # Análisis SHAP
        shap_result = ShapAnalyzer.get_shap_analysis(features_df)
        print(shap_result)
        # Ensamblar resultado
        prob_red_win, prob_blue_win = win_probs[0], win_probs[1]
        predicted_winner = "blue" if prob_blue_win > prob_red_win else "red"

        return MatchPrediction(
            match_key=match_key,
            predicted_winner=predicted_winner,
            win_probability={"red": round(float(prob_red_win), 4), "blue": round(float(prob_blue_win), 4)},
            predicted_scores={"red": int(round(red_score)), "blue": int(round(blue_score))},
            shap_analysis=shap_result
        )
    
    def predict_all_matches_for_event(self, event_key: str) -> List[MatchPrediction]:
        """
        Obtiene, procesa y predice todos los partidos de un evento de manera eficiente.
        """
        print(f"--- Iniciando predicción por lotes para el evento: {event_key} ---")
        
        # --- Fase 1: Obtención de Datos por Lotes ---
        # Llama a nuestra nueva función para obtener todos los datos de los equipos una sola vez.
        all_team_features = Fetcher.get_all_team_features_for_event(event_key)
        if not all_team_features:
            print("No se pudieron obtener los datos de los equipos, cancelando predicción.")
            return []

        # Obtener la lista de todos los partidos del evento
        try:
            req = requests.get(f"https://www.thebluealliance.com/api/v3/event/{event_key}/matches/simple", headers=TBA_HEADER)
            req.raise_for_status()
            all_matches = req.json()
            event_week = Fetcher.tba.get_event_week(event_key)
        except requests.exceptions.RequestException as e:
            print(f"ERROR: No se pudieron obtener los partidos para el evento {event_key}: {e}")
            return []

        # --- Fase 2: Ensamblaje de Características en Memoria ---
        features_list = []
        valid_matches_for_prediction = [] # Guardamos los partidos que pudimos procesar

        for match in all_matches:
            # if match['comp_level'] != 'qm': # Opcional: filtrar solo qual matches
            #     continue

            try:
                raw_features = {'week': 8 if event_week is None else event_week}
                
                red_teams = [team[3:] for team in match['alliances']['red']['team_keys']]
                blue_teams = [team[3:] for team in match['alliances']['blue']['team_keys']]

                for i in range(3):
                    # Búsquedas en diccionario (instantáneas), no llamadas a la API
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
                print(f"WARN: Saltando partido {match['key']} debido a datos de equipo faltantes: {e}")
        
        if not features_list:
            print("No se pudieron ensamblar características para ningún partido.")
            return []
            
        # --- Fase 3: Predicción por Lotes ---
        print(f"Realizando predicción por lotes para {len(features_list)} partidos...")
        features_df = pd.DataFrame(features_list)
        
        # Llama a .predict() una sola vez para cada modelo sobre el DataFrame completo
        all_win_probs = loader.classifier.predict_proba(features_df)
        all_red_scores = loader.red_regressor.predict(features_df)
        all_blue_scores = loader.blue_regressor.predict(features_df)
        
        # --- Fase 4: Formateo de Resultados ---
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
            
        print("--- Predicción por lotes completada. ---")
        return predictions