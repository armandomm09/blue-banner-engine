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

// FTCTeam represents a team at an FTC event
type FTCTeam struct {
	TeamNumber int    `json:"teamNumber"`
	NameShort  string `json:"nameShort"`
	NameFull   string `json:"nameFull"`
	City       string `json:"city"`
	StateProv  string `json:"stateprov"`
	Country    string `json:"country"`
}

// FTCMatch represents a match at an FTC event
type FTCMatch struct {
	MatchNumber     int    `json:"matchNumber"`
	Description     string `json:"description"`
	TournamentLevel string `json:"tournamentLevel"`
	StartTime       string `json:"startTime,omitempty"`
	ActualStartTime string `json:"actualStartTime,omitempty"`
	Teams           []struct {
		TeamNumber int    `json:"teamNumber"`
		Station    string `json:"station"`
	} `json:"teams"`
}

// FTCScheduleResponse represents the FTC API schedule response
type FTCScheduleResponse struct {
	Schedule []FTCMatch `json:"schedule"`
}

// FTCTeamsResponse represents the FTC API teams response
type FTCTeamsResponse struct {
	Teams []FTCTeam `json:"teams"`
}

// GetFTCEventMatches fetches match schedule for an FTC event
// @Summary      Get FTC Event Match Schedule
// @Description  Retrieves the match schedule for an FTC event from the FIRST FTC API
// @Tags         ftc
// @Produce      json
// @Param        season    path      string  true  "FTC Season (e.g., 2024)"
// @Param        eventCode path      string  true  "FTC Event Code (e.g., TXHOU)"
// @Success      200       {array}   FTCMatch
// @Failure      500       {object}  ErrorResponse
// @Router       /ftc/event/{season}/{eventCode}/matches [get]
func GetFTCEventMatches(c *gin.Context) {
	season := c.Param("season")
	eventCode := c.Param("eventCode")

	ftcApiKey := c.MustGet("ftcApiKey").(string)
	if ftcApiKey == "" {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "FTC_API_KEY is not configured on the server"})
		return
	}

	// Try to get qualification matches first
	url := fmt.Sprintf("https://ftc-api.firstinspires.org/v2.0/%s/schedule/%s/qual/hybrid", season, eventCode)
	matches, err := fetchFTCSchedule(url, ftcApiKey)
	if err != nil {
		log.Printf("Error fetching FTC qual schedule: %v", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to fetch FTC event schedule"})
		return
	}

	c.JSON(http.StatusOK, matches)
}

// GetFTCEventTeams fetches teams at an FTC event
// @Summary      Get FTC Event Teams
// @Description  Retrieves the list of teams at an FTC event from the FIRST FTC API
// @Tags         ftc
// @Produce      json
// @Param        season    path      string  true  "FTC Season (e.g., 2024)"
// @Param        eventCode path      string  true  "FTC Event Code (e.g., TXHOU)"
// @Success      200       {array}   FTCTeam
// @Failure      500       {object}  ErrorResponse
// @Router       /ftc/event/{season}/{eventCode}/teams [get]
func GetFTCEventTeams(c *gin.Context) {
	season := c.Param("season")
	eventCode := c.Param("eventCode")

	ftcApiKey := c.MustGet("ftcApiKey").(string)
	if ftcApiKey == "" {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "FTC_API_KEY is not configured on the server"})
		return
	}

	url := fmt.Sprintf("https://ftc-api.firstinspires.org/v2.0/%s/teams?eventCode=%s", season, eventCode)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Basic "+ftcApiKey)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error contacting FTC API: %v", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to contact FTC API"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("FTC API returned status %s: %s", resp.Status, string(bodyBytes))
		c.JSON(resp.StatusCode, ErrorResponse{Error: "Received an error from FTC API"})
		return
	}

	var teamsResp FTCTeamsResponse
	if err := json.NewDecoder(resp.Body).Decode(&teamsResp); err != nil {
		log.Printf("Error parsing FTC teams response: %v", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to parse FTC API response"})
		return
	}

	c.JSON(http.StatusOK, teamsResp.Teams)
}

// GetFTCTeamMatches fetches matches for a specific team at an FTC event
// @Summary      Get FTC Team Matches
// @Description  Retrieves matches for a specific team at an FTC event
// @Tags         ftc
// @Produce      json
// @Param        season     path      string  true  "FTC Season (e.g., 2024)"
// @Param        eventCode  path      string  true  "FTC Event Code (e.g., TXHOU)"
// @Param        teamNumber path      int     true  "Team Number"
// @Success      200        {array}   FTCMatch
// @Failure      500        {object}  ErrorResponse
// @Router       /ftc/event/{season}/{eventCode}/team/{teamNumber}/matches [get]
func GetFTCTeamMatches(c *gin.Context) {
	season := c.Param("season")
	eventCode := c.Param("eventCode")
	teamNumber := c.Param("teamNumber")

	ftcApiKey := c.MustGet("ftcApiKey").(string)
	if ftcApiKey == "" {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "FTC_API_KEY is not configured on the server"})
		return
	}

	url := fmt.Sprintf("https://ftc-api.firstinspires.org/v2.0/%s/schedule/%s/qual/hybrid?teamNumber=%s", season, eventCode, teamNumber)
	matches, err := fetchFTCSchedule(url, ftcApiKey)
	if err != nil {
		log.Printf("Error fetching FTC team matches: %v", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to fetch FTC team matches"})
		return
	}

	c.JSON(http.StatusOK, matches)
}

func fetchFTCSchedule(url string, apiKey string) ([]FTCMatch, error) {
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Basic "+apiKey)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("FTC API returned status %s: %s", resp.Status, string(bodyBytes))
	}

	var scheduleResp FTCScheduleResponse
	if err := json.NewDecoder(resp.Body).Decode(&scheduleResp); err != nil {
		return nil, err
	}

	return scheduleResp.Schedule, nil
}

// RegisterFtcRoutes registers all FTC API proxy routes
func RegisterFtcRoutes(router *gin.RouterGroup, ftcApiKey string) {
	router.Use(func(c *gin.Context) {
		c.Set("ftcApiKey", ftcApiKey)
		c.Next()
	})

	router.GET("/ftc/event/:season/:eventCode/matches", GetFTCEventMatches)
	router.GET("/ftc/event/:season/:eventCode/teams", GetFTCEventTeams)
	router.GET("/ftc/event/:season/:eventCode/team/:teamNumber/matches", GetFTCTeamMatches)
}
