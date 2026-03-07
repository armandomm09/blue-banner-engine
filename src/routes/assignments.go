package routes

import (
	"blue-banner-engine/src/types"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

type BackendAssignment struct {
	ScoutUserID        string `json:"scout_user_id"`
	AssignedTeamNumber int    `json:"assigned_team_number"`
}

type AutofillRequest struct {
	ActiveScouts       []string            `json:"active_scouts"`
	UnassignedTeams    []int               `json:"unassigned_teams"`
	CurrentAssignments []BackendAssignment `json:"current_assignments"`
}

type FixCollisionsRequest struct {
	Assignments []BackendAssignment `json:"assignments"`
	Matches     []types.TbaMatch    `json:"matches"`
	Scouts      []string            `json:"scouts"`
}

// AutofillAssignments godoc
// @Summary      Autofill scouting assignments
// @Description  Distributes unassigned teams among active scouts round-robin.
// @Tags         assignments
// @Accept       json
// @Produce      json
// @Param        request  body      AutofillRequest  true  "Autofill Request"
// @Success      200      {array}   BackendAssignment
// @Router       /assignments/autofill [post]
func AutofillAssignments(c *gin.Context) {
	var req AutofillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	if len(req.ActiveScouts) == 0 {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "No active scouts provided"})
		return
	}

	newAssignments := make([]BackendAssignment, 0)
	for i, teamNum := range req.UnassignedTeams {
		scoutID := req.ActiveScouts[i%len(req.ActiveScouts)]
		newAssignments = append(newAssignments, BackendAssignment{
			ScoutUserID:        scoutID,
			AssignedTeamNumber: teamNum,
		})
	}

	c.JSON(http.StatusOK, newAssignments)
}

// FixAssignmentCollisions godoc
// @Summary      Fix assignment collisions
// @Description  Attempts to resolve scouting collisions (scout assigned to multiple teams in same match).
// @Tags         assignments
// @Accept       json
// @Produce      json
// @Param        request  body      FixCollisionsRequest  true  "Fix Collisions Request"
// @Success      200      {array}   BackendAssignment
// @Router       /assignments/fix-collisions [post]
func FixAssignmentCollisions(c *gin.Context) {
	var req FixCollisionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	if len(req.Scouts) == 0 {
		c.JSON(http.StatusOK, req.Assignments)
		return
	}

	// 1. Precompute match-team mapping and get scout-team mapping
	teamToScout := make(map[int]string)
	for _, a := range req.Assignments {
		teamToScout[a.AssignedTeamNumber] = a.ScoutUserID
	}

	type MatchTeams struct {
		Key   string
		Teams []int
	}
	allMatches := make([]MatchTeams, 0)
	for _, m := range req.Matches {
		teams := make([]int, 0)
		for _, key := range m.Alliances.Red.TeamKeys {
			var num int
			fmt.Sscanf(key, "frc%d", &num)
			teams = append(teams, num)
		}
		for _, key := range m.Alliances.Blue.TeamKeys {
			var num int
			fmt.Sscanf(key, "frc%d", &num)
			teams = append(teams, num)
		}
		allMatches = append(allMatches, MatchTeams{Key: m.Key, Teams: teams})
	}

	// Helper to count collisions for a specific mapping
	countCollisions := func(mapping map[int]string) int {
		total := 0
		for _, m := range allMatches {
			scoutCounts := make(map[string]int)
			for _, t := range m.Teams {
				scoutID := mapping[t]
				if scoutID != "" {
					scoutCounts[scoutID]++
				}
			}
			for _, count := range scoutCounts {
				if count > 1 {
					total += (count - 1)
				}
			}
		}
		return total
	}

	currentCollisions := countCollisions(teamToScout)
	if currentCollisions == 0 {
		c.JSON(http.StatusOK, req.Assignments)
		return
	}

	// 2. Iterative greedy optimization
	maxIterations := 50
	for iter := 0; iter < maxIterations; iter++ {
		improved := false

		// Try every possible single reassignment to see if it improves things
		for teamNum, currentScout := range teamToScout {
			for _, otherScout := range req.Scouts {
				if otherScout == currentScout {
					continue
				}

				// Tentative move
				oldScout := teamToScout[teamNum]
				teamToScout[teamNum] = otherScout
				newCollisions := countCollisions(teamToScout)

				if newCollisions < currentCollisions {
					currentCollisions = newCollisions
					improved = true
					if currentCollisions == 0 {
						goto done
					}
					// Keep this move and restart scan for further improvements
					break
				} else {
					// Revert
					teamToScout[teamNum] = oldScout
				}
			}
			if improved {
				break
			}
		}

		if !improved {
			break
		}
	}

done:
	// 3. Convert back to assignments
	finalAssignments := make([]BackendAssignment, 0)
	for teamNum, scoutID := range teamToScout {
		finalAssignments = append(finalAssignments, BackendAssignment{
			ScoutUserID:        scoutID,
			AssignedTeamNumber: teamNum,
		})
	}

	c.JSON(http.StatusOK, finalAssignments)
}

func RegisterAssignmentRoutes(router *gin.RouterGroup) {
	router.POST("/assignments/autofill", AutofillAssignments)
	router.POST("/assignments/fix-collisions", FixAssignmentCollisions)
}
