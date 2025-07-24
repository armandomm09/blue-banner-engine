// main.go

package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"blue-banner-engine/docs"
	pb "blue-banner-engine/protos"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"blue-banner-engine/src/helpers"
)

// --- Estructuras para la Respuesta JSON de nuestra API ---
type ErrorResponse struct {
	Error string `json:"error"`
}

type ShapAnalysisJSON struct {
	BaseValue    float32   `json:"base_value"`
	Values       []float32 `json:"values"`
	FeatureNames []string  `json:"feature_names"`
	FeatureData  []float32 `json:"feature_data"`
}

type PredictionResponseJSON struct {
	MatchKey        string             `json:"match_key" example:"2025mxle_qm1"`
	PredictedWinner string             `json:"predicted_winner" example:"blue"`
	WinProbability  map[string]float32 `json:"win_probability" example:"red:0.21,blue:0.79"`
	PredictedScores map[string]int32   `json:"predicted_scores" example:"red:95,blue:112"`
	Status          string             `json:"status" example:"played"`
	ActualWinner    string             `json:"actual_winner,omitempty" example:"red"`
	ActualScores    map[string]int32   `json:"actual_scores,omitempty" example:"red:100,blue:98"`
	ShapAnalysis    *ShapAnalysisJSON  `json:"shap_analysis,omitempty"`
}

type PredictionHandler struct {
	grpcClient pb.MatchpointClient
	tbaApiKey  string // Almacenamos la API key
}

// @title           Blue Banner Engine (BBE) API
// @version         1.0
// @description     This is the API server for the Blue Banner Engine, providing FRC match predictions.
// @termsOfService  http://swagger.io/terms/

// @contact.name   API Support
// @contact.url    http://www.swagger.io/support
// @contact.email  support@swagger.io

// @license.name  MIT
// @license.url   https://opensource.org/licenses/MIT

// @host      localhost:8080
// @BasePath  /api/v1
func main() {

	err := godotenv.Load() // Load .env file from current directory
	if err != nil {
		log.Println("Error loading .env file")
	}
	tbaKey := os.Getenv("TBA_API_KEY")
	if tbaKey == "" {
		log.Println("WARNING: TBA_API_KEY environment variable not set. Real match data will not be available.")
	}

	grpcServerAddress := os.Getenv("GRPC_SERVER_ADDRESS")
	if grpcServerAddress == "" {
		grpcServerAddress = "localhost:50051"
	}

	// --- Configuración del Cliente gRPC ---
	conn, err := grpc.Dial(grpcServerAddress, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()

	handler := &PredictionHandler{
		grpcClient: pb.NewMatchpointClient(conn),
		tbaApiKey:  tbaKey,
	}

	router := gin.Default()

	docs.SwaggerInfo.BasePath = "/api/v1"
	v1 := router.Group("/api/v1")
	{
		v1.GET("/predict/match/:match_key", handler.getPrediction)

		v1.GET("/predict/event/:event_key", handler.getEventPredictions)

	}
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	staticFiles := "bbe-ui/dist"

	router.StaticFS("/static", http.Dir(filepath.Join(staticFiles, "static")))
	router.StaticFS("/assets", http.Dir(filepath.Join(staticFiles, "assets")))
	router.StaticFile("/favicon.ico", filepath.Join(staticFiles, "favicon.ico"))
	router.StaticFile("/manifest.json", filepath.Join(staticFiles, "manifest.json"))

	router.NoRoute(func(c *gin.Context) {
		if !strings.HasPrefix(c.Request.URL.Path, "/api") && !strings.HasPrefix(c.Request.URL.Path, "/swagger") {
			path := filepath.Join(staticFiles, "index.html")
			_, err := os.Stat(path)
			if os.IsNotExist(err) {
				c.Writer.WriteHeader(http.StatusNotFound)
				return
			}
			c.File(path)
		}
	})

	log.Println("Starting BBE server on port 8080...")
	log.Println("Access the UI at http://localhost:8080/")
	log.Println("API documentation at http://localhost:8080/swagger/index.html")
	router.Run(":8080")
}

// @Summary      Get Single Match Prediction with SHAP
// @Description  Retrieves a detailed prediction for a single FRC match, including SHAP analysis for model explainability.
// @Tags         predictions
// @Accept       json
// @Produce      json
// @Param        match_key   path      string  true  "FRC Match Key (e.g., 2025mxle_qm12)"
// @Success      200         {object}  PredictionResponseJSON "Successful prediction"
// @Failure      500         {object}  ErrorResponse "Internal Server Error (e.g., gRPC call failed)"
// @Router       /predict/match/{match_key} [get]
func (h *PredictionHandler) getPrediction(c *gin.Context) {
	matchKey := c.Param("match_key")
	log.Printf("Received API request for match: %s", matchKey)

	var wg sync.WaitGroup
	wg.Add(2)

	var grpcResponse *pb.MatchPredictionResponse
	var grpcErr error
	var tbaMatch *helpers.TbaMatch
	var tbaErr error

	go func() {
		defer wg.Done()
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
		defer cancel()
		grpcResponse, grpcErr = h.grpcClient.GetMatchPrediction(ctx, &pb.MatchPredictionRequest{MatchKey: matchKey})
		if grpcErr != nil {
			log.Printf("gRPC call failed: %v", grpcErr)
			c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get prediction from prediction service"})
			return
		}
	}()

	// Fetch actual match data from TBA
	go func() {
		defer wg.Done()
		tbaMatch, tbaErr = helpers.FetchTbaMatch(matchKey, h.tbaApiKey)
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

	jsonResponse := PredictionResponseJSON{
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
		ShapAnalysis: &ShapAnalysisJSON{
			BaseValue:    grpcResponse.GetShapAnalysis().GetBaseValue(),
			Values:       grpcResponse.GetShapAnalysis().GetValues(),
			FeatureNames: grpcResponse.GetShapAnalysis().GetFeatureNames(),
			FeatureData:  grpcResponse.GetShapAnalysis().GetFeatureData(),
		},
		Status:       status,
		ActualWinner: actualWinner,
		ActualScores: actualScores,
	}

	c.JSON(http.StatusOK, jsonResponse)
}

// @Summary      Get All Match Predictions for an Event
// @Description  Retrieves all match predictions for a given FRC event key from the BBE prediction service.
// @Tags         predictions
// @Accept       json
// @Produce      json
// @Param        event_key   path      string  true  "FRC Event Key (e.g., 2025mxle)"
// @Success      200         {array}   PredictionResponseJSON "Successful prediction for all matches"
// @Failure      500         {object}  ErrorResponse "Internal Server Error (e.g., gRPC call failed)"
// @Router       /predict/event/{event_key} [get]
func (h *PredictionHandler) getEventPredictions(c *gin.Context) {
	eventKey := c.Param("event_key")
	log.Printf("Received API request for event: %s", eventKey)

	var wg sync.WaitGroup
	var predictions []*pb.MatchPredictionResponse
	var tbaMatches map[string]helpers.TbaMatch
	var grpcErr, tbaErr error

	wg.Add(2)

	go func() {
		defer wg.Done()
		ctx, cancel := context.WithTimeout(context.Background(), time.Second*30)
		defer cancel()
		var grpcResponse *pb.EventPredictionResponse
		grpcResponse, grpcErr = h.grpcClient.PredictAllEventMatches(ctx, &pb.EventPredictionRequest{EventKey: eventKey})
		if grpcResponse != nil {
			predictions = grpcResponse.GetPredictions()
		}
	}()

	go func() {
		defer wg.Done()
		tbaMatches, tbaErr = helpers.FetchTbaEventMatches(eventKey, h.tbaApiKey)
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

	jsonResponse := make([]PredictionResponseJSON, 0)
	for _, pred := range predictions {
		resp := PredictionResponseJSON{
			MatchKey:        pred.GetMatchKey(),
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
		jsonResponse = append(jsonResponse, resp)
	}

	c.JSON(http.StatusOK, jsonResponse)
}
