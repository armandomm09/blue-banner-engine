import json
import grpc
import traceback
import sys
from datetime import datetime, timezone
from concurrent import futures
from google.protobuf.timestamp_pb2 import Timestamp
from .generated import prediction_pb2
from .generated import prediction_pb2_grpc
from .services.mp_prediction import MatchpointPredictor, MatchPrediction
from .services.simulator import Simulator

class PredictorServicer(prediction_pb2_grpc.MatchpointServicer):
    """
    Implements the gRPC service for Matchpoint predictions.
    
    This class handles incoming gRPC requests, delegates the prediction logic
    to the MatchpointPredictor, and formats the responses as protobuf messages.
    """

    def __init__(self):
        """Initializes the service by creating an instance of the predictor."""
        self.predictor = MatchpointPredictor()
        print("MatchpointPredictor service initialized.")

    def GetMatchPrediction(self, request, context):
        """
        Handles a gRPC request for a single match prediction.

        Args:
            request: The incoming gRPC request object (prediction_pb2.MatchPredictionRequest).
            context: The gRPC context object.

        Returns:
            A prediction_pb2.MatchPredictionResponse protobuf message.
        """
        match_key = request.match_key
        print(f"Received gRPC request for match: {match_key}")

        try:
            prediction_object: MatchPrediction = self.predictor.get_match_prediction(
                match_key=str(match_key)
            )
            
            # Check if a valid prediction was returned
            if not prediction_object:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details(
                    f"Data for match {match_key} could not be found or processed."
                )
                return prediction_pb2.MatchPredictionResponse()

            # Convert the SHAP analysis data object to its protobuf representation
            shap_proto = prediction_pb2.ShapAnalysis(
                base_value=prediction_object.shap_analysis.base_value,
                values=prediction_object.shap_analysis.values,
                feature_names=prediction_object.shap_analysis.feature_names,
                feature_data=prediction_object.shap_analysis.feature_data,
            )

            # Build and return the final protobuf response
            return prediction_pb2.MatchPredictionResponse(
                match_key=prediction_object.match_key,
                predicted_winner=prediction_object.predicted_winner,
                win_probability=prediction_pb2.WinProbability(
                    red=prediction_object.win_probability["red"],
                    blue=prediction_object.win_probability["blue"],
                ),
                predicted_scores=prediction_pb2.PredictedScores(
                    red=prediction_object.predicted_scores["red"],
                    blue=prediction_object.predicted_scores["blue"],
                ),
                shap_analysis=shap_proto
            )
        except ValueError as e:
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(e))
            return prediction_pb2.MatchPredictionResponse()
        except Exception as e:
            print(f"FATAL ERROR processing {match_key}: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("An internal server error occurred.")
            return prediction_pb2.MatchPredictionResponse()
        
    def SimulatePlayoffs(self, request, context):
        """
        Handles a gRPC request for predicting all matches in an event.

        Args:
            request: The incoming gRPC request (prediction_pb2.EventPredictionRequest).
            context: The gRPC context object.

        Returns:
            A prediction_pb2.EventPredictionResponse containing a list of match predictions.
        """
        event_key = request.event_key
        n_sims = request.n_sims
        print(f"Received playoff simulation request event: {event_key}")

        try:
            # Call the batch prediction method
            sim = Simulator()
            alliance = sim.simulate_n_playoffs(event_key, 1000)
            # alliance = alliance.to_json()
            print(alliance)
            response = prediction_pb2.SimulationResult()
            response.event_key = alliance.event_key
            response.simulation_metadata.total_simulations_run = alliance._total_sims
            
            new_ts = datetime.now(timezone.utc)   # preferible: timezone-aware UTC
            response.simulation_metadata.timestamp_utc.FromDatetime(new_ts)
            
            for result in alliance.results:
                result_response = prediction_pb2.SimulationResult.Results()
                result_response.alliance_number = result["alliance_number"]
                for team in result["teams"]:
                    result_response.teams.append(int(team))
                result_response.wins = result["wins"]
                result_response.win_probability = result["win_probability"]
                response.results.append(result_response)
            
            print(response)
            return response

        except Exception as e:
            template = "An exception of type {0} occurred when simulating. Arguments:\n{1!r}"
            message = template.format(type(e).__name__, e.args)
            exc_type, exc_value, exc_traceback = sys.exc_info()
            #    Get the traceback object for the innermost frame
            tb_frame = exc_traceback.tb_frame
            # Get the line number from the traceback frame
            line_number = tb_frame.f_lineno
            print(f"An error occurred on line: {line_number}")
            # Optionally, print the full traceback for more context
            traceback.print_exc()
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("An internal server error occurred during batch prediction.")
            return prediction_pb2.EventPredictionResponse()
        
    def PredictAllEventMatches(self, request, context):
        """
        Handles a gRPC request for predicting all matches in an event.

        Args:
            request: The incoming gRPC request (prediction_pb2.EventPredictionRequest).
            context: The gRPC context object.

        Returns:
            A prediction_pb2.EventPredictionResponse containing a list of match predictions.
        """
        event_key = request.event_key
        print(f"Received gRPC batch prediction request for event: {event_key}")

        try:
            # Call the batch prediction method
            prediction_list: list[MatchPrediction] = self.predictor.predict_all_matches_for_event(event_key)

            # Create the main response message
            response = prediction_pb2.EventPredictionResponse()
            # Iterate over the Python objects and convert them to protobuf messages
            for prediction_obj in prediction_list:
                proto_prediction = prediction_pb2.MatchPredictionResponse(
                    match_key=prediction_obj.match_key,
                    predicted_winner=prediction_obj.predicted_winner,
                    win_probability=prediction_pb2.WinProbability(
                        red=prediction_obj.win_probability['red'],
                        blue=prediction_obj.win_probability['blue']
                    ),
                    predicted_scores=prediction_pb2.PredictedScores(
                        red=prediction_obj.predicted_scores['red'],
                        blue=prediction_obj.predicted_scores['blue']
                    )
                    # Note: SHAP analysis is not included in the batch response for efficiency
                )
                response.predictions.append(proto_prediction)
            
            return response

        except Exception as e:
            print(f"FATAL ERROR during batch processing for {event_key}: {e}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details("An internal server error occurred during batch prediction.")
            return prediction_pb2.EventPredictionResponse()
        
        

def serve():
    """
    Initializes and starts the gRPC server.
    """
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    prediction_pb2_grpc.add_MatchpointServicer_to_server(PredictorServicer(), server)
    server.add_insecure_port("[::]:50051")
    print("gRPC Matchpoint server started on port 50051.")
    server.start()
    server.wait_for_termination()

if __name__ == "__main__":
    serve()