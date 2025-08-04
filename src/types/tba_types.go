package types

type TbaAlliances struct {
	Blue struct {
		Score    int32    `json:"score"`
		TeamKeys []string `json:"team_keys"`
	} `json:"blue"`
	Red struct {
		Score    int32    `json:"score"`
		TeamKeys []string `json:"team_keys"`
	} `json:"red"`
}

type TbaTeamKeys struct {
	Blue []string `json:"blue"`
	Red  []string `json:"red"`
}

type TbaMatch struct {
	ActualTime      int          `json:"actual_time"`
	Alliances       TbaAlliances `json:"alliances"`
	CompLevel       string       `json:"comp_level"`
	EventKey        string       `json:"event_key"`
	Key             string       `json:"key"`
	MatchNumber     int          `json:"match_number"`
	PredictedTime   int          `json:"predicted_time"`
	SetNumber       int          `json:"set_number"`
	Time            int          `json:"time"`
	WinningAlliance string       `json:"winning_alliance"`
}

type TbaEventDetails struct {
	Key             string    `json:"key"`
	Name            string    `json:"name"`
	LocationName    string    `json:"location_name"`
	City            string    `json:"city"`
	StateProv       string    `json:"state_prov"`
	StartDate       string    `json:"start_date"`
	EndDate         string    `json:"end_date"`
	EventTypeString string    `json:"event_type_string"`
	Website         string    `json:"website"`
	Webcasts        []Webcast `json:"webcasts"`
}

type Webcast struct {
	Type    string `json:"type"`
	Channel string `json:"channel"`
}
