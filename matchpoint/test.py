from matchpoint.services.mp_prediction import MatchpointPredictor


print("Starting prediction...")
predictor = MatchpointPredictor()

pred = predictor.get_match_prediction("2025mxle_qm12")

print(pred)

print(pred.shap_analysis)