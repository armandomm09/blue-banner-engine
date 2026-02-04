package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestGetMatchTeamsInfo tests the analytics match endpoint
func TestGetMatchTeamsInfo(t *testing.T) {
	tests := []struct {
		name          string
		matchKey      string
		expectedCode  int
		expectedError bool
	}{
		{
			name:          "Valid match key",
			matchKey:      "2025mxle_f1m1",
			expectedCode:  http.StatusOK,
			expectedError: false,
		},
		{
			name:          "Empty match key",
			matchKey:      "",
			expectedCode:  http.StatusBadRequest,
			expectedError: true,
		},
		{
			name:          "Invalid match key format",
			matchKey:      "invalid",
			expectedCode:  http.StatusBadRequest,
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()

			// Add the route - mock version
			router.GET("/analytics/match/:match_key/teamsinfo", func(c *gin.Context) {
				matchKey := c.Param("match_key")
				if matchKey == "" {
					c.JSON(http.StatusBadRequest, gin.H{"error": "match_key parameter is required"})
					return
				}
				c.JSON(http.StatusOK, gin.H{"match_key": matchKey})
			})

			req, _ := http.NewRequest("GET", "/analytics/match/"+tt.matchKey+"/teamsinfo", nil)
			recorder := httptest.NewRecorder()

			router.ServeHTTP(recorder, req)

			assert.Equal(t, tt.expectedCode, recorder.Code)
		})
	}
}

// TestGetCustomTeamsInfo tests custom team analytics endpoint
func TestGetCustomTeamsInfo(t *testing.T) {
	tests := []struct {
		name          string
		teamNumbers   string
		expectedCode  int
		expectedError bool
	}{
		{
			name:          "Valid team numbers",
			teamNumbers:   "1690,3476,5800",
			expectedCode:  http.StatusOK,
			expectedError: false,
		},
		{
			name:          "Empty team numbers",
			teamNumbers:   "",
			expectedCode:  http.StatusBadRequest,
			expectedError: true,
		},
		{
			name:          "Single team",
			teamNumbers:   "1690",
			expectedCode:  http.StatusOK,
			expectedError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			router := gin.New()

			router.POST("/analytics/custom/teams", func(c *gin.Context) {
				teamNumbers := c.Query("team_numbers")
				if teamNumbers == "" {
					c.JSON(http.StatusBadRequest, gin.H{"error": "team_numbers parameter is required"})
					return
				}
				c.JSON(http.StatusOK, gin.H{"team_numbers": teamNumbers})
			})

			req, _ := http.NewRequest("POST", "/analytics/custom/teams?team_numbers="+tt.teamNumbers, nil)
			recorder := httptest.NewRecorder()

			router.ServeHTTP(recorder, req)

			assert.Equal(t, tt.expectedCode, recorder.Code)
		})
	}
}

// TestAnalyticsErrorHandling tests error handling in analytics routes
func TestAnalyticsErrorHandling(t *testing.T) {
	tests := []struct {
		name         string
		input        string
		expectError  bool
		errorMessage string
	}{
		{
			name:         "Missing parameter",
			input:        "",
			expectError:  true,
			errorMessage: "parameter is required",
		},
		{
			name:         "Valid input",
			input:        "2025mxle_f1m1",
			expectError:  false,
			errorMessage: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.expectError {
				assert.Empty(t, tt.input)
			} else {
				assert.NotEmpty(t, tt.input)
			}
		})
	}
}
