package routes

import (
	"blue-banner-engine/src/clients"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// @Summary      Get Statbotics Metrics for a Team
// @Description  Fetches EPA and other metrics from Statbotics for a specific team and year.
// @Tags         metrics
// @Produce      json
// @Param        teamNumber path      int  true  "Team Number"
// @Param        year       query     int  false "Year (default: current year)"
// @Success      200        {object}  clients.TeamYearMetric
// @Failure      400        {object}  ErrorResponse
// @Failure      500        {object}  ErrorResponse
// @Router       /statbotics/team/{teamNumber}/metrics [get]
func GetStatboticsTeamMetrics(c *gin.Context) {
	teamNumberStr := c.Param("teamNumber")
	teamNumber, err := strconv.Atoi(teamNumberStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid team number"})
		return
	}

	yearStr := c.Query("year")
	year := time.Now().Year() // Default to current year
	if yearStr != "" {
		y, err := strconv.Atoi(yearStr)
		if err == nil {
			year = y
		}
	}

	client := clients.NewStatboticsClient()
	metrics, err := client.GetTeamYearMetrics(teamNumber, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Failed to fetch from Statbotics: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

func RegisterStatboticsRoutes(router *gin.RouterGroup) {
	router.GET("/statbotics/team/:teamNumber/metrics", GetStatboticsTeamMetrics)
}
