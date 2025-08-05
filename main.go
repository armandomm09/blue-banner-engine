// main.go

package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"blue-banner-engine/docs"
	pb "blue-banner-engine/protos"
	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"blue-banner-engine/src/routes"
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

type TbaEvent struct {
	Key       string `json:"key"`
	Name      string `json:"name"`
	EventCode string `json:"event_code"`
	EventType int    `json:"event_type"`
	City      string `json:"city"`
	StateProv string `json:"state_prov"`
	Country   string `json:"country"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
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

	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://172.16.194.210:8080", "http://localhost:8080"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	docs.SwaggerInfo.BasePath = "/api/v1"
	v1 := router.Group("/api/v1")
	{
		routes.RegisterMatchpointRoutes(v1, handler.grpcClient, tbaKey)
		routes.RegisterTbaRoutes(v1, tbaKey)

	}

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	staticFiles := "bbe-ui/dist"

	router.StaticFS("/static", http.Dir(filepath.Join(staticFiles, "static")))
	router.StaticFS("/assets", http.Dir(filepath.Join(staticFiles, "assets")))
	router.StaticFile("/favicon.ico", filepath.Join(staticFiles, "favicon.ico"))
	router.StaticFile("/manifest.json", filepath.Join(staticFiles, "manifest.json"))
	router.GET("/swagger.json", func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.File("docs/swagger.json")
	})
	router.OPTIONS("/swagger.json", func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Status(http.StatusOK)
	})

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
