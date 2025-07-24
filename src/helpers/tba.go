package helpers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// TbaScore represents the score for an alliance
type TbaScore struct {
	Score int32 `json:"score"`
}

// TbaAlliances represents the alliances in a match
type TbaAlliances struct {
	Red  TbaScore `json:"red"`
	Blue TbaScore `json:"blue"`
}

// TbaMatch represents a match from TBA
type TbaMatch struct {
	Key             string       `json:"key"`
	CompLevel       string       `json:"comp_level"`
	WinningAlliance string       `json:"winning_alliance"`
	Alliances       TbaAlliances `json:"alliances"`
}

// FetchTbaEventMatches fetches all matches for a given event from TBA
func FetchTbaEventMatches(eventKey, tbaApiKey string) (map[string]TbaMatch, error) {
	if tbaApiKey == "" {
		return nil, fmt.Errorf("TBA_API_KEY is not configured")
	}

	url := fmt.Sprintf("https://www.thebluealliance.com/api/v3/event/%s/matches/simple", eventKey)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-TBA-Auth-Key", tbaApiKey)

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

	matchMap := make(map[string]TbaMatch)
	for _, match := range matches {
		matchMap[match.Key] = match
	}
	return matchMap, nil
}

// FetchTbaMatch fetches a single match from TBA by match key
func FetchTbaMatch(matchKey, tbaApiKey string) (*TbaMatch, error) {
	if tbaApiKey == "" {
		return nil, fmt.Errorf("TBA_API_KEY is not configured")
	}

	url := fmt.Sprintf("https://www.thebluealliance.com/api/v3/match/%s", matchKey)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-TBA-Auth-Key", tbaApiKey)

	client := &http.Client{Timeout: time.Second * 10}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("TBA API returned status %s", resp.Status)
	}

	var match TbaMatch
	if err := json.NewDecoder(resp.Body).Decode(&match); err != nil {
		return nil, err
	}
	return &match, nil
}
