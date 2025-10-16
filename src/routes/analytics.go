// src/routes/analytics.go

package routes

import (
	pb "blue-banner-engine/protos/analytics" // <-- Asegúrate que la ruta sea correcta
	"context"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type TeamInfo struct {
	TeamNumber int32                  `json:"team_number"`
	Alliance   string                 `json:"alliance"`
	Metrics    map[string]interface{} `json:"metrics"`
}

// @Summary      Get Analytics for All Teams in a Match
// @Description  Retrieves detailed analytics for all six teams participating in a given FRC match from the Python service.
// @Tags         analytics
// @Accept       json
// @Produce      json
// @Param        match_key   path      string  true  "FRC Match Key (e.g., 2025mxle_f1m1)"
// @Success      200         {array}   TeamInfo "Successful retrieval of all team analytics"
// @Failure      400         {object}  ErrorResponse "Bad Request (e.g., missing match_key)"
// @Failure      500         {object}  ErrorResponse "Internal Server Error (e.g., gRPC call failed)"
// @Router       /analytics/match/{match_key}/teamsinfo [get]
func GetMatchTeamsInfo(c *gin.Context) {
	matchKey := c.Param("match_key")
	if matchKey == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "match_key parameter is required"})
		return
	}
	log.Printf("Received API request for match analytics: %s", matchKey)

	grpcClient := c.MustGet("analyticsGrpcClient").(pb.AnalyticsClient)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	grpcResponse, err := grpcClient.GetMatchAnalytics(ctx, &pb.GetMatchAnalyticsRequest{MatchKey: matchKey})
	if err != nil {
		log.Printf("Analytics gRPC call failed: %v", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get analytics from Python service"})
		return
	}

	teamMapping := grpcResponse.GetTeamMapping()
	features := grpcResponse.GetFeatures()

	teamsDataMap := make(map[int32]*TeamInfo)

	for position, teamNumber := range teamMapping {
		if _, ok := teamsDataMap[teamNumber]; !ok {
			alliance := "red"
			if strings.HasPrefix(position, "blue") {
				alliance = "blue"
			}
			teamsDataMap[teamNumber] = &TeamInfo{
				TeamNumber: teamNumber,
				Alliance:   alliance,
				Metrics:    make(map[string]interface{}),
			}
		}
	}

	for featureKey, value := range features {
		for position, teamNumber := range teamMapping {
			prefix := position + "_"
			if strings.HasPrefix(featureKey, prefix) {
				metricName := strings.TrimPrefix(featureKey, prefix)
				teamsDataMap[teamNumber].Metrics[metricName] = value
				break
			}
		}
	}

	var response []TeamInfo
	for _, teamData := range teamsDataMap {
		response = append(response, *teamData)
	}

	c.JSON(http.StatusOK, response)
}

// @Summary      Get Analytics for a Custom List of Teams
// @Description  Retrieves detailed analytics for a custom list of up to 6 teams at a given event.
// @Tags         analytics
// @Accept       json
// @Produce      json
// @Param        event_key   query     string  true  "FRC Event Key (e.g., 2025mxle)"
// @Param        teams       query     string  true  "Comma-separated list of team numbers (e.g., 3478,4400,4775)"
// @Success      200         {array}   TeamInfo "Successful retrieval of custom team analytics"
// @Failure      400         {object}  ErrorResponse "Bad Request (e.g., missing params, too many teams)"
// @Failure      500         {object}  ErrorResponse "Internal Server Error (e.g., gRPC call failed)"
// @Router       /analytics/teams [get]
func GetCustomTeamsInfo(c *gin.Context) {
	eventKey := c.Query("event_key")
	teamsQuery := c.Query("teams")

	if eventKey == "" || teamsQuery == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "event_key and teams query parameters are required"})
		return
	}

	teamStrings := strings.Split(teamsQuery, ",")
	if len(teamStrings) > 6 {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Cannot request more than 6 teams at a time"})
		return
	}

	var teamNumbers []int32
	for _, s := range teamStrings {
		num, err := strconv.Atoi(s)
		if err != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid team number provided: " + s})
			return
		}
		teamNumbers = append(teamNumbers, int32(num))
	}

	log.Printf("Received API request for custom teams %v at event %s", teamNumbers, eventKey)

	grpcClient := c.MustGet("analyticsGrpcClient").(pb.AnalyticsClient)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	req := &pb.GetCustomTeamsAnalyticsRequest{
		EventKey:    eventKey,
		TeamNumbers: teamNumbers,
	}

	grpcResponse, err := grpcClient.GetCustomTeamsAnalytics(ctx, req)
	if err != nil {
		log.Printf("Custom analytics gRPC call failed: %v", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get analytics from Python service"})
		return
	}

	var response []TeamInfo
	for _, teamData := range grpcResponse.GetTeams() {
		response = append(response, TeamInfo{
			TeamNumber: teamData.GetTeamNumber(),
			Alliance:   "none",
			Metrics:    convertFloat64Map(teamData.GetMetrics()),
		})
	}

	c.JSON(http.StatusOK, response)
}

func convertFloat64Map(m map[string]float64) map[string]interface{} {
	newMap := make(map[string]interface{}, len(m))
	for k, v := range m {
		newMap[k] = v
	}
	return newMap
}

func RegisterAnalyticsRoutes(router *gin.RouterGroup, analyticsGrpcClient pb.AnalyticsClient) {
	router.Use(func(c *gin.Context) {
		c.Set("analyticsGrpcClient", analyticsGrpcClient)
		c.Next()
	})

	router.GET("/analytics/match/:match_key/teamsinfo", GetMatchTeamsInfo)
	router.GET("/analytics/teams", GetCustomTeamsInfo)
}
