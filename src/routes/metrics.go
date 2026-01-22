package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type MetricDefinition struct {
	Key         string   `json:"key"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Source      string   `json:"source"`     // "tba", "statbotics", "pit", "match"
	Type        string   `json:"type"`       // "number", "text", "boolean", "categorical"
	Dimensions  []string `json:"dimensions"` // "time" (match-based), "single" (event-based)
}

// @Summary      Get Metric Metadata
// @Description  Returns a list of all available metrics for visualization.
// @Tags         metrics
// @Produce      json
// @Success      200 {array} MetricDefinition
// @Router       /metrics/metadata [get]
func GetMetricMetadata(c *gin.Context) {
	// In a real implementation, this might be dynamic based on database or configuration.
	// For now, we define a static registry based on known data sources.

	metrics := []MetricDefinition{
		// TBA Metrics
		{Key: "opr", Name: "OPR", Description: "Offensive Power Rating", Source: "tba", Type: "number", Dimensions: []string{"single"}},
		{Key: "dpr", Name: "DPR", Description: "Defensive Power Rating", Source: "tba", Type: "number", Dimensions: []string{"single"}},
		{Key: "ccwm", Name: "CCWM", Description: "Calculated Contribution to Winning Margin", Source: "tba", Type: "number", Dimensions: []string{"single"}},
		{Key: "rank", Name: "Rank", Description: "Event Rank", Source: "tba", Type: "number", Dimensions: []string{"single"}},

		// Statbotics Metrics
		{Key: "epa.mean", Name: "EPA Mean", Description: "Mean Expected Points Added (Season Average)", Source: "statbotics", Type: "number", Dimensions: []string{"single"}},
		{Key: "epa.total_points", Name: "Total EPA", Description: "Expected Points Added", Source: "statbotics", Type: "number", Dimensions: []string{"single"}},
		{Key: "epa.auto_points", Name: "Auto EPA", Description: "Auto Expected Points Added", Source: "statbotics", Type: "number", Dimensions: []string{"single"}},
		{Key: "epa.teleop_points", Name: "Teleop EPA", Description: "Teleop Expected Points Added", Source: "statbotics", Type: "number", Dimensions: []string{"single"}},
		{Key: "epa.endgame_points", Name: "Endgame EPA", Description: "Endgame Expected Points Added", Source: "statbotics", Type: "number", Dimensions: []string{"single"}},
		{Key: "record.winrate", Name: "Winrate", Description: "Winrate", Source: "statbotics", Type: "number", Dimensions: []string{"single"}},

		// Match Scouting Metrics (Based on 2024 schema)
		{Key: "auto_speaker_scored", Name: "Auto Speaker", Description: "Notes scored in Speaker during Auto", Source: "match", Type: "number", Dimensions: []string{"time", "single"}},
		{Key: "auto_amp_scored", Name: "Auto Amp", Description: "Notes scored in Amp during Auto", Source: "match", Type: "number", Dimensions: []string{"time", "single"}},
		{Key: "teleop_speaker_scored", Name: "Teleop Speaker", Description: "Notes scored in Speaker during Teleop", Source: "match", Type: "number", Dimensions: []string{"time", "single"}},
		{Key: "teleop_amp_scored", Name: "Teleop Amp", Description: "Notes scored in Amp during Teleop", Source: "match", Type: "number", Dimensions: []string{"time", "single"}},
		{Key: "teleop_trap_scored", Name: "Trap Scored", Description: "Notes scored in Trap", Source: "match", Type: "number", Dimensions: []string{"time", "single"}},

		// Pit Scouting Metrics
		{Key: "drivetrain_motors", Name: "Drivetrain Motors", Description: "Number of motors", Source: "pit", Type: "number", Dimensions: []string{"single"}},
		{Key: "robot_weight", Name: "Weight", Description: "Robot Weight (lbs)", Source: "pit", Type: "number", Dimensions: []string{"single"}},
	}

	c.JSON(http.StatusOK, metrics)
}

func RegisterMetricRoutes(router *gin.RouterGroup) {
	router.GET("/metrics/metadata", GetMetricMetadata)
}
