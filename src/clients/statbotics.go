package clients

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type StatboticsClient struct {
	BaseURL string
	Client  *http.Client
}

func NewStatboticsClient() *StatboticsClient {
	return &StatboticsClient{
		BaseURL: "https://api.statbotics.io/v3",
		Client:  &http.Client{Timeout: 10 * time.Second},
	}
}

type TeamYearMetric struct {
	Team       int    `json:"team"`
	Year       int    `json:"year"`
	Name       string `json:"name"`
	Country    string `json:"country"`
	State      string `json:"state"`
	District   string `json:"district"`
	RookieYear int    `json:"rookie_year"`
	EPA        struct {
		Mean             float64 `json:"mean"`
		Unitless         float64 `json:"unitless"`
		TotalPoints      float64 `json:"total_points"`
		AutoPoints       float64 `json:"auto_points"`
		TeleopPoints     float64 `json:"teleop_points"`
		EndgamePoints    float64 `json:"endgame_points"`
		RP1              float64 `json:"rp_1"`
		RP2              float64 `json:"rp_2"`
		RP3              float64 `json:"rp_3"`
		TiebreakerPoints float64 `json:"tiebreaker_points"`
	} `json:"epa"`
	Record struct {
		Wins    int     `json:"wins"`
		Losses  int     `json:"losses"`
		Ties    int     `json:"ties"`
		Count   int     `json:"count"`
		Winrate float64 `json:"winrate"`
	} `json:"record"`
	Competing struct {
		ThisWeek      bool   `json:"this_week"`
		NextEventKey  string `json:"next_event_key"`
		NextEventName string `json:"next_event_name"`
		NextEventWeek int    `json:"next_event_week"`
	} `json:"competing"`
}

type statboticsResponse struct {
	Team       int    `json:"team"`
	Year       int    `json:"year"`
	Name       string `json:"name"`
	Country    string `json:"country"`
	State      string `json:"state"`
	District   string `json:"district"`
	RookieYear int    `json:"rookie_year"`
	EPA        struct {
		TotalPoints struct {
			Mean float64 `json:"mean"`
			SD   float64 `json:"sd"`
		} `json:"total_points"`
		Unitless  float64 `json:"unitless"`
		Breakdown struct {
			TotalPoints      float64 `json:"total_points"`
			AutoPoints       float64 `json:"auto_points"`
			TeleopPoints     float64 `json:"teleop_points"`
			EndgamePoints    float64 `json:"endgame_points"`
			RP1              float64 `json:"rp_1"`
			RP2              float64 `json:"rp_2"`
			RP3              float64 `json:"rp_3"`
			TiebreakerPoints float64 `json:"tiebreaker_points"`
		} `json:"breakdown"`
	} `json:"epa"`
	Record struct {
		Wins    int     `json:"wins"`
		Losses  int     `json:"losses"`
		Ties    int     `json:"ties"`
		Count   int     `json:"count"`
		Winrate float64 `json:"winrate"`
	} `json:"record"`
	Competing struct {
		ThisWeek      bool   `json:"this_week"`
		NextEventKey  string `json:"next_event_key"`
		NextEventName string `json:"next_event_name"`
		NextEventWeek int    `json:"next_event_week"`
	} `json:"competing"`
}

func (s *StatboticsClient) GetTeamYearMetrics(teamNumber int, year int) (*TeamYearMetric, error) {
	url := fmt.Sprintf("%s/team_year/%d/%d", s.BaseURL, teamNumber, year)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("statbotics api returned status: %s", resp.Status)
	}

	var sbResp statboticsResponse
	if err := json.NewDecoder(resp.Body).Decode(&sbResp); err != nil {
		return nil, err
	}

	metric := &TeamYearMetric{
		Team:       sbResp.Team,
		Year:       sbResp.Year,
		Name:       sbResp.Name,
		Country:    sbResp.Country,
		State:      sbResp.State,
		District:   sbResp.District,
		RookieYear: sbResp.RookieYear,
		Record:     sbResp.Record,
		Competing:  sbResp.Competing,
	}

	metric.EPA.Mean = sbResp.EPA.TotalPoints.Mean
	metric.EPA.Unitless = sbResp.EPA.Unitless
	metric.EPA.TotalPoints = sbResp.EPA.Breakdown.TotalPoints
	metric.EPA.AutoPoints = sbResp.EPA.Breakdown.AutoPoints
	metric.EPA.TeleopPoints = sbResp.EPA.Breakdown.TeleopPoints
	metric.EPA.EndgamePoints = sbResp.EPA.Breakdown.EndgamePoints
	metric.EPA.RP1 = sbResp.EPA.Breakdown.RP1
	metric.EPA.RP2 = sbResp.EPA.Breakdown.RP2
	metric.EPA.RP3 = sbResp.EPA.Breakdown.RP3
	metric.EPA.TiebreakerPoints = sbResp.EPA.Breakdown.TiebreakerPoints

	return metric, nil
}
