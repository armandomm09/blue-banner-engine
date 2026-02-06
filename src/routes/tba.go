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

// TeamKeysEvent representa la respuesta de claves de equipo para un evento
type TeamKeysEvent struct {
	TeamKeys []string `json:"team_keys"`
}

// TbaTeam represents a team at an FRC event (aligned with FTC structure)
type TbaTeam struct {
	TeamNumber int    `json:"teamNumber"`
	NameShort  string `json:"nameShort"`
	NameFull   string `json:"nameFull"`
	City       string `json:"city"`
	StateProv  string `json:"stateprov"`
	Country    string `json:"country"`
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

// GetAllTeamsByEvent godoc
// @Summary      Get All Teams for an Event
// @Description  Retrieves a list of all teams participating in a given FRC event from The Blue Alliance.
// @Tags         events
// @Produce      json
// @Param        eventKey   path      string  true  "FRC Event Key (e.g., 2025mexas)"
// @Success      200    {array}   TbaTeam
// @Failure      500    {object}  ErrorResponse
// @Router       /events/teams/{eventKey} [get]
func GetAllTeamsByEvent(c *gin.Context) {
	eventKey := c.Param("eventKey")

	tbaApiKey := c.MustGet("tbaApiKey").(string)
	if tbaApiKey == "" {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "TBA_API_KEY is not configured on the server"})
		return
	}

	url := fmt.Sprintf("https://www.thebluealliance.com/api/v3/event/%s/teams/simple", eventKey)
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

	var tbaTeams []struct {
		TeamNumber int    `json:"team_number"`
		Nickname   string `json:"nickname"`
		Name       string `json:"name"`
		City       string `json:"city"`
		StateProv  string `json:"state_prov"`
		Country    string `json:"country"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tbaTeams); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to parse response from The Blue Alliance API"})
		return
	}

	result := make([]TbaTeam, len(tbaTeams))
	for i, t := range tbaTeams {
		result[i] = TbaTeam{
			TeamNumber: t.TeamNumber,
			NameShort:  t.Nickname,
			NameFull:   t.Name,
			City:       t.City,
			StateProv:  t.StateProv,
			Country:    t.Country,
		}
	}

	c.JSON(http.StatusOK, result)
}

// GetAllTeamNumbersByEvent godoc
// @Summary      Get All Team Numbers for an Event
// @Description  Retrieves a list of all team numbers participating in a given FRC event from The Blue Alliance.
// @Tags         events
// @Produce      json
// @Param        eventKey   path      string  true  "FRC Event Key (e.g., 2025mexas)"
// @Success      200    {array}   int
// @Failure      500    {object}  ErrorResponse
// @Router       /events/teams/{eventKey}/numbers [get]
func GetAllTeamNumbersByEvent(c *gin.Context) {
	eventKey := c.Param("eventKey")

	tbaApiKey := c.MustGet("tbaApiKey").(string)
	if tbaApiKey == "" {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "TBA_API_KEY is not configured on the server"})
		return
	}

	url := fmt.Sprintf("https://www.thebluealliance.com/api/v3/event/%s/teams/keys", eventKey)
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

	var teamKeys []string
	if err := json.NewDecoder(resp.Body).Decode(&teamKeys); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to parse response from The Blue Alliance API"})
		return
	}

	teamNumbers := make([]int, len(teamKeys))
	for i, key := range teamKeys {
		fmt.Sscanf(key, "frc%d", &teamNumbers[i])
	}

	c.JSON(http.StatusOK, teamNumbers)
}

// @Summary      Get TBA Metrics for a Team
// @Description  Fetches rankings and OPRs for a team at a specific event.
// @Tags         metrics
// @Produce      json
// @Param        teamNumber path      int     true  "Team Number"
// @Param        eventKey   query     string  true  "Event Key"
// @Success      200        {object}  map[string]interface{}
// @Failure      400        {object}  ErrorResponse
// @Failure      500        {object}  ErrorResponse
// @Router       /tba/team/{teamNumber}/metrics [get]
func GetTeamMetrics(c *gin.Context) {
	teamNumber := c.Param("teamNumber")
	eventKey := c.Query("eventKey")

	if eventKey == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "eventKey is required"})
		return
	}

	tbaApiKey := c.MustGet("tbaApiKey").(string)

	// Fetch Event Status for the team (includes rank, record, etc.)
	url := fmt.Sprintf("https://www.thebluealliance.com/api/v3/team/frc%s/event/%s/status", teamNumber, eventKey)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("X-TBA-Auth-Key", tbaApiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to contact TBA"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(resp.StatusCode, ErrorResponse{Error: "TBA Error"})
		return
	}

	var status map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&status)

	// Fetch Event OPRs (all teams) and filter
	// This is inefficient if done per-team repeatedly, but simple for now.
	// Caching should be added later.
	urlOprs := fmt.Sprintf("https://www.thebluealliance.com/api/v3/event/%s/oprs", eventKey)
	reqOprs, _ := http.NewRequest("GET", urlOprs, nil)
	reqOprs.Header.Set("X-TBA-Auth-Key", tbaApiKey)
	respOprs, err := client.Do(reqOprs)

	var oprs map[string]interface{}
	if err == nil && respOprs.StatusCode == http.StatusOK {
		json.NewDecoder(respOprs.Body).Decode(&oprs)
		respOprs.Body.Close()
	}

	// Construct result
	result := gin.H{
		"status": status,
		"oprs":   gin.H{},
	}

	// Extract OPR/DPR/CCWM for this team
	teamKey := fmt.Sprintf("frc%s", teamNumber)
	if oprs != nil {
		if val, ok := oprs["oprs"].(map[string]interface{})[teamKey]; ok {
			result["oprs"].(gin.H)["opr"] = val
		}
		if val, ok := oprs["dprs"].(map[string]interface{})[teamKey]; ok {
			result["oprs"].(gin.H)["dpr"] = val
		}
		if val, ok := oprs["ccwms"].(map[string]interface{})[teamKey]; ok {
			result["oprs"].(gin.H)["ccwm"] = val
		}
	}

	c.JSON(http.StatusOK, result)
}

// GetEventSchedule fetches the match schedule for an FRC event
// @Summary      Get TBA Event Schedule
// @Description  Retrieves the match schedule for an FRC event from The Blue Alliance
// @Tags         events
// @Produce      json
// @Param        eventKey path      string  true  "FRC Event Key (e.g., 2025mxmo)"
// @Success      200      {array}   map[string]interface{}
// @Failure      500      {object}  ErrorResponse
// @Router       /tba/event/{eventKey}/schedule [get]
func GetEventSchedule(c *gin.Context) {
	eventKey := c.Param("eventKey")

	tbaApiKey := c.MustGet("tbaApiKey").(string)
	if tbaApiKey == "" {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "TBA_API_KEY is not configured on the server"})
		return
	}

	url := fmt.Sprintf("https://www.thebluealliance.com/api/v3/event/%s/matches/simple", eventKey)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("X-TBA-Auth-Key", tbaApiKey)

	client := &http.Client{Timeout: 15 * time.Second}
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

	var matches []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&matches); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to parse response from The Blue Alliance API"})
		return
	}

	c.JSON(http.StatusOK, matches)
}

// GetTeamEventMatches fetches matches for a specific team at an FRC event
// @Summary      Get Team Event Matches
// @Description  Retrieves matches for a specific team at an FRC event from The Blue Alliance
// @Tags         events
// @Produce      json
// @Param        eventKey   path      string  true  "FRC Event Key (e.g., 2025mxmo)"
// @Param        teamNumber path      int     true  "Team Number"
// @Success      200        {array}   map[string]interface{}
// @Failure      500        {object}  ErrorResponse
// @Router       /tba/event/{eventKey}/team/{teamNumber}/matches [get]
func GetTeamEventMatches(c *gin.Context) {
	eventKey := c.Param("eventKey")
	teamNumber := c.Param("teamNumber")

	tbaApiKey := c.MustGet("tbaApiKey").(string)
	if tbaApiKey == "" {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "TBA_API_KEY is not configured on the server"})
		return
	}

	url := fmt.Sprintf("https://www.thebluealliance.com/api/v3/team/frc%s/event/%s/matches/simple", teamNumber, eventKey)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("X-TBA-Auth-Key", tbaApiKey)

	client := &http.Client{Timeout: 15 * time.Second}
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

	var matches []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&matches); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to parse response from The Blue Alliance API"})
		return
	}

	c.JSON(http.StatusOK, matches)
}

func RegisterTbaRoutes(router *gin.RouterGroup, tbaApiKey string) {
	router.Use(func(c *gin.Context) {
		c.Set("tbaApiKey", tbaApiKey)
		c.Next()
	})

	router.GET("/events/:year", GetAllEvents)
	router.GET("/events/teams/:eventKey", GetAllTeamsByEvent)
	router.GET("/events/teams/:eventKey/numbers", GetAllTeamNumbersByEvent)
	router.GET("/tba/team/:teamNumber/metrics", GetTeamMetrics)
	router.GET("/tba/event/:eventKey/schedule", GetEventSchedule)
	router.GET("/tba/event/:eventKey/team/:teamNumber/matches", GetTeamEventMatches)
}
