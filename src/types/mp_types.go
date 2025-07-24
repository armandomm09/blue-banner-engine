package types

import pb "blue-banner-engine/protos"

type ShapAnalysis struct {
	BaseValue    float32   `json:"base_value"`
	Values       []float32 `json:"values"`
	FeatureNames []string  `json:"feature_names"`
	FeatureData  []float32 `json:"feature_data"`
}

type MatchPrediction struct {
	MatchKey        string             `json:"match_key" example:"2025mxle_qm1"`
	PredictedWinner string             `json:"predicted_winner" example:"blue"`
	WinProbability  map[string]float32 `json:"win_probability" example:"red:0.21,blue:0.79"`
	PredictedScores map[string]int32   `json:"predicted_scores" example:"red:95,blue:112"`
	Status          string             `json:"status" example:"played"`
	ActualWinner    string             `json:"actual_winner,omitempty" example:"red"`
	ActualScores    map[string]int32   `json:"actual_scores,omitempty" example:"red:100,blue:98"`
	ShapAnalysis    *ShapAnalysis      `json:"shap_analysis,omitempty"`
}

type PredictionHandler struct {
	grpcClient pb.MatchpointClient
	tbaApiKey  string // Almacenamos la API key
}

type EventAnalysisResponse struct {
	EventDetails *TbaEventDetails  `json:"event_details"`
	Predictions  []MatchPrediction `json:"predictions"`
}
