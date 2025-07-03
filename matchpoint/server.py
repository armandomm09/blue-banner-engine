from concurrent import futures
import grpc
import time


from . import prediction_pb2
from . import prediction_pb2_grpc
from .services.mp_prediction import MatchpointPredictor, MatchPrediction


class PredictorServicer(prediction_pb2_grpc.MatchpointServicer):

    def __init__(self):
        self.predictor = MatchpointPredictor()
        print("MatchpointPredictor service initialized.")

    def GetMatchPrediction(self, request, context):
        match_key = request.match_key
        print(f"Received gRPC request for match: {match_key}")

        try:

            prediction_object: MatchPrediction = self.predictor.get_match_prediction(
                match_key
            )

            if not prediction_object:
                context.set_code(grpc.StatusCode.NOT_FOUND)
                context.set_details(
                    f"Data for match {match_key} could not be found or processed."
                )
                return prediction_pb2.MatchPredictionResponse()

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


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    prediction_pb2_grpc.add_MatchpointServicer_to_server(PredictorServicer(), server)
    server.add_insecure_port("[::]:50051")
    print("gRPC Matchpoint server started on port 50051.")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
