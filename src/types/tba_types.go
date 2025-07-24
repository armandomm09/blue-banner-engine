package types

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
