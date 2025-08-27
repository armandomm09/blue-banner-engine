package routes

import (
	pb "blue-banner-engine/protos"
	"blue-banner-engine/src/types"
	"context"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// @Summary      Get the playoff simulated n times for an Event
// @Description  Using matchpoint predictor, simulates the playoff results for an event
// @Tags         predictions
// @Accept       json
// @Produce      json
// @Param        event_key   path      string  true  "FRC Event Key (e.g., 2025mxle)"
// @Param        n_sims   	 path      int  true  "Number of desired simulations (e.g., 1000)"
// @Success      200         {array}   types.SimulationResponse "Successful prediction for all matches"
// @Failure      500         {object}  ErrorResponse "Internal Server Error (e.g., gRPC call failed)"
// @Router       /predict/event/{event_key}/playoff/{n_sims} [get]
func GetPlayoffSimulation(c *gin.Context) {
	eventKey := c.Param("event_key")
	nSims, err := strconv.Atoi(c.Param("n_sims"))

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Cannot parse number of simulation string to integer",
		})
		return
	}

	if nSims > 10000 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Number of simulations exceeds the limit of 5000",
		})
		return
	}
	unSims := uint32(nSims)

	log.Printf("Received API request for simulation: %s", eventKey)

	grpcClient := c.MustGet("grpcClient").(pb.MatchpointClient)

	var simulationRes *pb.SimulationResult

	var grpcErr error

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
	defer cancel()
	var grpcResponse *pb.SimulationResult
	grpcResponse, grpcErr = grpcClient.SimulatePlayoffs(ctx, &pb.SimulationRequest{EventKey: eventKey, NSims: unSims})
	if grpcResponse != nil {
		simulationRes = grpcResponse
	}

	if grpcErr != nil {
		log.Printf("gRPC call failed: %v", grpcErr)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get predictions from ML service"})
		return
	}

	responseMetadata := types.SimulationMetadata{
		TotalSimulationsRun: int(simulationRes.SimulationMetadata.TotalSimulationsRun),
		TimestampUtc:        simulationRes.SimulationMetadata.TimestampUtc.AsTime(),
	}

	responseResults := []types.Result{}

	for _, res := range simulationRes.Results {
		finalRes := types.Result{}

		finalRes.AllianceNumber = int(res.AllianceNumber)

		teams := make([]int, len(res.Teams))
		for i, team := range res.Teams {
			teams[i] = int(team)
		}

		finalRes.WinProbability = res.WinProbability
		finalRes.Wins = int(res.Wins)
		finalRes.Teams = teams

		responseResults = append(responseResults, finalRes)

	}

	jsonResonse := types.SimulationResponse{
		EventKey: eventKey,
		Metadata: responseMetadata,
		Results:  responseResults,
	}
	c.JSON(http.StatusOK, jsonResonse)
}

func RegisterSimulationRoutes(router *gin.RouterGroup, grpcClient pb.MatchpointClient) {
	router.Use(func(c *gin.Context) {
		c.Set("grpcClient", grpcClient)
		c.Next()
	})

	router.GET("/predict/event/:event_key/playoff/:n_sims", GetPlayoffSimulation)

}
