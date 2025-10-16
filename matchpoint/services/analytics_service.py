import grpc
from matchpoint.generated import analytics_pb2
from matchpoint.generated import analytics_pb2_grpc
from matchpoint.third_parties.fetcher import Fetcher

import requests


class AnalyticsService(analytics_pb2_grpc.AnalyticsServicer):
    """
    Implementa el servicio gRPC de Analytics.
    """

    def GetMatchAnalytics(self, request, context):
        """
        Manejador para el RPC que obtiene los datos de un partido.
        """
        print(f"gRPC call received for match: {request.match_key}")

        features, team_mapping = Fetcher.get_match_features(request.match_key)

        if features is None or team_mapping is None:

            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(
                f"Could not retrieve data for match key: {request.match_key}"
            )
            return analytics_pb2.GetMatchAnalyticsResponse()

        return analytics_pb2.GetMatchAnalyticsResponse(
            features=features, team_mapping=team_mapping
        )

    def GetCustomTeamsAnalytics(self, request, context):
        """
        Manejador para el RPC que obtiene datos de una lista personalizada de equipos.
        """
        print(f"gRPC call received for custom teams at event: {request.event_key}")

        teams_data = Fetcher.get_custom_teams_features(
            request.event_key, list(request.team_numbers)
        )

        if teams_data is None:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(
                f"Failed to retrieve bulk data for event {request.event_key}"
            )
            return analytics_pb2.GetCustomTeamsAnalyticsResponse()

        response = analytics_pb2.GetCustomTeamsAnalyticsResponse()
        for team_info in teams_data:
            team_analytics = analytics_pb2.TeamAnalytics(
                team_number=team_info["team_number"],
                name=team_info["name"],
                metrics=team_info["metrics"],
            )
            response.teams.append(team_analytics)

        return response
