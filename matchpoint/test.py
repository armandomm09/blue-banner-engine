from matchpoint.services.mp_prediction import MatchpointPredictor
import time

mp = MatchpointPredictor()

print("Predicting all matches for event 2025mxle")
start_time = time.time()
print(mp.predict_all_matches_for_event("2025mxle"))
end_time = time.time()

print(f"Time taken: {end_time - start_time} seconds")
