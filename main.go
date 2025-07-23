// main.go

package main

import (
	"context"
	"encoding/json"
	"fmt"
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
)

type TbaScore struct {
	Score int32 `json:"score"`
}
type TbaAlliances struct {
	Red  TbaScore `json:"red"`
	Blue TbaScore `json:"blue"`
}
type TbaMatch struct {
	Key             string       `json:"key"`
	CompLevel       string       `json:"comp_level"`
	WinningAlliance string       `json:"winning_alliance"`
	Alliances       TbaAlliances `json:"alliances"`
}

// --- Estructuras para la Respuesta JSON de nuestra API ---
type ErrorResponse struct {
	Error string `json:"error"`
}

type PredictionResponseJSON struct {
	MatchKey        string             `json:"match_key" example:"2025mxle_qm1"`
	PredictedWinner string             `json:"predicted_winner" example:"blue"`
	WinProbability  map[string]float32 `json:"win_probability" example:"red:0.21,blue:0.79"`
	PredictedScores map[string]int32   `json:"predicted_scores" example:"red:95,blue:112"`
	Status          string             `json:"status" example:"played"`
	ActualWinner    string             `json:"actual_winner,omitempty" example:"red"`
	ActualScores    map[string]int32   `json:"actual_scores,omitempty" example:"red:100,blue:98"`
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
		v1.GET("/predict/:match_key", handler.getPrediction)

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
	var tbaMatches map[string]TbaMatch
	var grpcErr, tbaErr error

	wg.Add(2) // Vamos a ejecutar 2 tareas en paralelo

	// Tarea 1: Obtener Predicciones del Servicio de Python (en una goroutine)
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

	// Tarea 2: Obtener Resultados Oficiales de The Blue Alliance (en una goroutine)
	go func() {
		defer wg.Done()
		tbaMatches, tbaErr = h.fetchTbaResults(eventKey)
	}()

	wg.Wait() // Espera a que ambas tareas terminen

	// Manejo de errores después de la espera
	if grpcErr != nil {
		log.Printf("gRPC call failed: %v", grpcErr)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to get predictions from ML service"})
		return
	}
	if tbaErr != nil {
		log.Printf("TBA API call failed: %v", tbaErr)
		// No fallamos la petición completa, solo loggeamos. Aún podemos devolver las predicciones.
	}

	// Fusión de Datos: Enriquece las predicciones con los resultados reales
	jsonResponse := make([]PredictionResponseJSON, 0)
	for _, pred := range predictions {
		resp := PredictionResponseJSON{
			MatchKey:        pred.GetMatchKey(),
			PredictedWinner: pred.GetPredictedWinner(),
			WinProbability:  map[string]float32{"red": pred.GetWinProbability().GetRed(), "blue": pred.GetWinProbability().GetBlue()},
			PredictedScores: map[string]int32{"red": pred.GetPredictedScores().GetRed(), "blue": pred.GetPredictedScores().GetBlue()},
			Status:          "upcoming", // Por defecto es 'upcoming'
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

// --- Nueva Función Auxiliar para llamar a la API de TBA ---
func (h *PredictionHandler) fetchTbaResults(eventKey string) (map[string]TbaMatch, error) {
	if h.tbaApiKey == "" {
		return nil, fmt.Errorf("TBA_API_KEY is not configured")
	}

	url := fmt.Sprintf("https://www.thebluealliance.com/api/v3/event/%s/matches/simple", eventKey)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("X-TBA-Auth-Key", h.tbaApiKey)

	client := &http.Client{Timeout: time.Second * 10}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TBA API returned status %s", resp.Status)
	}

	var matches []TbaMatch
	if err := json.NewDecoder(resp.Body).Decode(&matches); err != nil {
		return nil, err
	}

	// Convertimos la lista a un mapa para búsquedas O(1), mucho más rápido
	matchMap := make(map[string]TbaMatch)
	for _, match := range matches {
		// if match.CompLevel == "qm" { // Solo nos interesan los de clasificación
		matchMap[match.Key] = match
		// }
	}
	return matchMap, nil
}
