package routes

import (
	pb "blue-banner-engine/protos"
	"blue-banner-engine/src/helpers"
	types "blue-banner-engine/src/types"
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// @Summary      Get All Match Predictions for an Event
// @Description  Retrieves all match predictions for a given FRC event key from the BBE prediction service.
// @Tags         predictions
// @Accept       json
// @Produce      json
// @Param        event_key   path      string  true  "FRC Event Key (e.g., 2025mxle)"
// @Success      200         {array}   types.MatchPrediction "Successful prediction for all matches"
// @Failure      500         {object}  ErrorResponse "Internal Server Error (e.g., gRPC call failed)"
// @Router       /predict/event/{event_key} [get]
func GetAllMatchPredictionsForEvent(c *gin.Context) {
	eventKey := c.Param("event_key")
	log.Printf("Received API request for event: %s", eventKey)

	grpcClient := c.MustGet("grpcClient").(pb.MatchpointClient)
	tbaApiKey := c.MustGet("tbaApiKey").(string)

	var wg sync.WaitGroup
	var predictions []*pb.MatchPredictionResponse
	var tbaMatches map[string]types.TbaMatch
	var grpcErr, tbaErr error
	var tbaEventDetails *types.TbaEventDetails
	var tbaEventErr error

	wg.Add(3)

	go func() {
		defer wg.Done()
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
		defer cancel()
		var grpcResponse *pb.EventPredictionResponse
		grpcResponse, grpcErr = grpcClient.PredictAllEventMatches(ctx, &pb.EventPredictionRequest{EventKey: eventKey})
		if grpcResponse != nil {
			predictions = grpcResponse.GetPredictions()
		}
	}()

	go func() {
		defer wg.Done()
		tbaMatches, tbaErr = helpers.FetchTbaEventMatches(eventKey, tbaApiKey)
	}()

	go func() {
		defer wg.Done()
		details, err := helpers.FetchTbaEventDetails(eventKey, tbaApiKey)
		tbaEventDetails = (*types.TbaEventDetails)(details)
		tbaEventErr = err
	}()

	wg.Wait()

	if grpcErr != nil {
		log.Printf("gRPC call failed: %v", grpcErr)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get predictions from ML service"})
		return
	}
	if tbaErr != nil {
		log.Printf("TBA API call failed: %v", tbaErr)
	}
	if tbaEventErr != nil {
		log.Printf("TBA API call failed: %v", tbaEventErr)
	}

	jsonResponse := types.EventAnalysisResponse{
		EventDetails: tbaEventDetails,
		Predictions:  make([]types.MatchPrediction, 0),
	}
	for _, pred := range predictions {
		resp := types.MatchPrediction{
			MatchKey: pred.GetMatchKey(),
			TeamsKeys: types.TbaTeamKeys{
				Blue: tbaMatches[pred.GetMatchKey()].Alliances.Blue.TeamKeys,
				Red:  tbaMatches[pred.GetMatchKey()].Alliances.Red.TeamKeys,
			},
			PredictedWinner: pred.GetPredictedWinner(),
			WinProbability:  map[string]float32{"red": pred.GetWinProbability().GetRed(), "blue": pred.GetWinProbability().GetBlue()},
			PredictedScores: map[string]int32{"red": pred.GetPredictedScores().GetRed(), "blue": pred.GetPredictedScores().GetBlue()},
			Status:          "upcoming",
		}

		if tbaMatch, ok := tbaMatches[pred.GetMatchKey()]; ok && tbaMatch.WinningAlliance != "" {
			resp.Status = "played"
			resp.ActualWinner = tbaMatch.WinningAlliance
			resp.ActualScores = map[string]int32{
				"red":  tbaMatch.Alliances.Red.Score,
				"blue": tbaMatch.Alliances.Blue.Score,
			}
		}
		jsonResponse.Predictions = append(jsonResponse.Predictions, resp)
	}

	c.JSON(http.StatusOK, jsonResponse)
}

// @Summary      Get Single Match Prediction with SHAP
// @Description  Retrieves a detailed prediction for a single FRC match, including SHAP analysis for model explainability.
// @Tags         predictions
// @Accept       json
// @Produce      json
// @Param        match_key   path      string  true  "FRC Match Key (e.g., 2025mxle_qm12)"
// @Success      200         {object}  types.MatchPrediction "Successful prediction"
// @Failure      500         {object}  ErrorResponse "Internal Server Error (e.g., gRPC call failed)"
// @Router       /predict/match/{match_key} [get]
func GetSingleMatchPrediction(c *gin.Context) {
	matchKey := c.Param("match_key")
	log.Printf("Received API request for match: %s", matchKey)

	grpcClient := c.MustGet("grpcClient").(pb.MatchpointClient)
	tbaApiKey := c.MustGet("tbaApiKey").(string)

	var wg sync.WaitGroup
	wg.Add(2)

	var grpcResponse *pb.MatchPredictionResponse
	var grpcErr error
	var tbaMatch *types.TbaMatch
	var tbaErr error

	go func() {
		defer wg.Done()
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
		defer cancel()
		grpcResponse, grpcErr = grpcClient.GetMatchPrediction(ctx, &pb.MatchPredictionRequest{MatchKey: matchKey})
		if grpcErr != nil {
			log.Printf("gRPC call failed: %v", grpcErr)
			c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get prediction from prediction service"})
			return
		}
	}()

	// Fetch actual match data from TBA
	go func() {
		defer wg.Done()
		tbaMatch, tbaErr = helpers.FetchTbaMatch(matchKey, tbaApiKey)
		if tbaErr != nil {
			log.Printf("TBA API call failed: %v", tbaErr)
		}
	}()
	wg.Wait()
	status := "upcoming"

	var actualWinner string
	var actualScores map[string]int32
	if tbaErr == nil && tbaMatch.WinningAlliance != "" {
		status = "played"
		actualWinner = tbaMatch.WinningAlliance
		actualScores = map[string]int32{
			"red":  tbaMatch.Alliances.Red.Score,
			"blue": tbaMatch.Alliances.Blue.Score,
		}
	}

	jsonResponse := types.MatchPrediction{
		MatchKey:        grpcResponse.GetMatchKey(),
		PredictedWinner: grpcResponse.GetPredictedWinner(),
		WinProbability: map[string]float32{
			"red":  grpcResponse.GetWinProbability().GetRed(),
			"blue": grpcResponse.GetWinProbability().GetBlue(),
		},
		PredictedScores: map[string]int32{
			"red":  grpcResponse.GetPredictedScores().GetRed(),
			"blue": grpcResponse.GetPredictedScores().GetBlue(),
		},
		ShapAnalysis: &types.ShapAnalysis{
			BaseValue:    grpcResponse.GetShapAnalysis().GetBaseValue(),
			Values:       grpcResponse.GetShapAnalysis().GetValues(),
			FeatureNames: grpcResponse.GetShapAnalysis().GetFeatureNames(),
			FeatureData:  grpcResponse.GetShapAnalysis().GetFeatureData(),
		},
		Status:       status,
		ActualWinner: actualWinner,
		ActualScores: actualScores,
		TeamsKeys: types.TbaTeamKeys{
			Blue: tbaMatch.Alliances.Blue.TeamKeys,
			Red:  tbaMatch.Alliances.Red.TeamKeys,
		},
	}

	c.JSON(http.StatusOK, jsonResponse)
}

func RegisterMatchpointRoutes(router *gin.RouterGroup, grpcClient pb.MatchpointClient, tbaApiKey string) {
	router.Use(func(c *gin.Context) {
		c.Set("grpcClient", grpcClient)
		c.Set("tbaApiKey", tbaApiKey)
		c.Next()
	})

	router.GET("/predict/event/:event_key", GetAllMatchPredictionsForEvent)
	router.GET("/predict/match/:match_key", GetSingleMatchPrediction)
}
