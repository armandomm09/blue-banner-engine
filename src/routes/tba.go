package routes

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// TbaEvent representa un evento FRC simplificado
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

// ErrorResponse envuelve un mensaje de error
type ErrorResponse struct {
	Error string `json:"error"`
}

// GetAllEvents godoc
// @Summary      Get All Events for a Year
// @Description  Retrieves a simplified list of all FRC events for a given year from The Blue Alliance.
// @Tags         events
// @Produce      json
// @Param        year   path      int  true  "FRC Year (e.g., 2024)"
// @Success      200    {array}   TbaEvent
// @Failure      500    {object}  ErrorResponse
// @Router       /events/{year} [get]
func GetAllEvents(c *gin.Context) {
	year := c.Param("year")
	log.Printf("Received API request for events in year: %s", year)

	tbaApiKey := c.MustGet("tbaApiKey").(string)
	if tbaApiKey == "" {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "TBA_API_KEY is not configured on the server"})
		return
	}

	url := fmt.Sprintf("https://www.thebluealliance.com/api/v3/events/%s/simple", year)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("X-TBA-Auth-Key", tbaApiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to contact The Blue Alliance API"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("TBA API returned status %s: %s", resp.Status, string(bodyBytes))
		c.JSON(resp.StatusCode, ErrorResponse{Error: "Received an error from The Blue Alliance API"})
		return
	}

	var events []TbaEvent
	if err := json.NewDecoder(resp.Body).Decode(&events); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to parse response from The Blue Alliance API"})
		return
	}

	c.JSON(http.StatusOK, events)
}

func RegisterTbaRoutes(router *gin.RouterGroup, tbaApiKey string) {
	router.Use(func(c *gin.Context) {
		c.Set("tbaApiKey", tbaApiKey)
		c.Next()
	})

	router.GET("/events/:year", GetAllEvents)
}
