// main.go

package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"blue-banner-engine/docs"
	pb "blue-banner-engine/protos"
	"path/filepath"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type ErrorResponse struct {
	Error string `json:"error"`
}

type PredictionResponseJSON struct {
	MatchKey        string             `json:"match_key" example:"2024txda_qm1"`
	PredictedWinner string             `json:"predicted_winner" example:"blue"`
	WinProbability  map[string]float32 `json:"win_probability" example:"red:0.21,blue:0.79"`
	PredictedScores map[string]int32   `json:"predicted_scores" example:"red:95,blue:112"`
}

type PredictionHandler struct {
	grpcClient pb.MatchpointClient
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

	grpcServerAddress := os.Getenv("GRPC_SERVER_ADDRESS")
	if grpcServerAddress == "" {
		grpcServerAddress = "localhost:50051"
	}

	log.Printf("Attempting to connect to gRPC server at: %s", grpcServerAddress)

	conn, err := grpc.Dial(grpcServerAddress, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	defer conn.Close()

	handler := &PredictionHandler{
		grpcClient: pb.NewMatchpointClient(conn),
	}

	router := gin.Default()

	docs.SwaggerInfo.BasePath = "/api/v1"
	v1 := router.Group("/api/v1")
	{
		v1.GET("/predict/:match_key", handler.getPrediction)
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

// @Summary      Get Match Prediction
// @Description  Retrieves a full prediction for a given FRC match key from the BBE prediction service.
// @Tags         predictions
// @Accept       json
// @Produce      json
// @Param        match_key   path      string  true  "FRC Match Key (e.g., 2025mxle_qm12)"
// @Success      200         {object}  PredictionResponseJSON "Successful prediction"
// @Failure      500         {object}  ErrorResponse "Internal Server Error (e.g., gRPC call failed)"
// @Router       /predict/{match_key} [get]
func (h *PredictionHandler) getPrediction(c *gin.Context) {
	matchKey := c.Param("match_key")
	log.Printf("Received API request for match: %s", matchKey)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10) // Timeout de 5 segundos
	defer cancel()

	grpcResponse, err := h.grpcClient.GetMatchPrediction(ctx, &pb.MatchPredictionRequest{MatchKey: matchKey})
	if err != nil {
		log.Printf("gRPC call failed: %v", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get prediction from prediction service"})
		return
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
	}

	c.JSON(http.StatusOK, jsonResponse)
}
