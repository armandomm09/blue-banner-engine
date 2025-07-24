from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class EventPredictionRequest(_message.Message):
    __slots__ = ("event_key",)
    EVENT_KEY_FIELD_NUMBER: _ClassVar[int]
    event_key: str
    def __init__(self, event_key: _Optional[str] = ...) -> None: ...

class EventPredictionResponse(_message.Message):
    __slots__ = ("predictions",)
    PREDICTIONS_FIELD_NUMBER: _ClassVar[int]
    predictions: _containers.RepeatedCompositeFieldContainer[MatchPredictionResponse]
    def __init__(self, predictions: _Optional[_Iterable[_Union[MatchPredictionResponse, _Mapping]]] = ...) -> None: ...

class MatchPredictionRequest(_message.Message):
    __slots__ = ("match_key",)
    MATCH_KEY_FIELD_NUMBER: _ClassVar[int]
    match_key: str
    def __init__(self, match_key: _Optional[str] = ...) -> None: ...

class MatchPredictionResponse(_message.Message):
    __slots__ = ("match_key", "predicted_winner", "win_probability", "predicted_scores", "shap_analysis")
    MATCH_KEY_FIELD_NUMBER: _ClassVar[int]
    PREDICTED_WINNER_FIELD_NUMBER: _ClassVar[int]
    WIN_PROBABILITY_FIELD_NUMBER: _ClassVar[int]
    PREDICTED_SCORES_FIELD_NUMBER: _ClassVar[int]
    SHAP_ANALYSIS_FIELD_NUMBER: _ClassVar[int]
    match_key: str
    predicted_winner: str
    win_probability: WinProbability
    predicted_scores: PredictedScores
    shap_analysis: ShapAnalysis
    def __init__(self, match_key: _Optional[str] = ..., predicted_winner: _Optional[str] = ..., win_probability: _Optional[_Union[WinProbability, _Mapping]] = ..., predicted_scores: _Optional[_Union[PredictedScores, _Mapping]] = ..., shap_analysis: _Optional[_Union[ShapAnalysis, _Mapping]] = ...) -> None: ...

class ShapAnalysis(_message.Message):
    __slots__ = ("base_value", "values", "feature_names", "feature_data")
    BASE_VALUE_FIELD_NUMBER: _ClassVar[int]
    VALUES_FIELD_NUMBER: _ClassVar[int]
    FEATURE_NAMES_FIELD_NUMBER: _ClassVar[int]
    FEATURE_DATA_FIELD_NUMBER: _ClassVar[int]
    base_value: float
    values: _containers.RepeatedScalarFieldContainer[float]
    feature_names: _containers.RepeatedScalarFieldContainer[str]
    feature_data: _containers.RepeatedScalarFieldContainer[float]
    def __init__(self, base_value: _Optional[float] = ..., values: _Optional[_Iterable[float]] = ..., feature_names: _Optional[_Iterable[str]] = ..., feature_data: _Optional[_Iterable[float]] = ...) -> None: ...

class WinProbability(_message.Message):
    __slots__ = ("red", "blue")
    RED_FIELD_NUMBER: _ClassVar[int]
    BLUE_FIELD_NUMBER: _ClassVar[int]
    red: float
    blue: float
    def __init__(self, red: _Optional[float] = ..., blue: _Optional[float] = ...) -> None: ...

class PredictedScores(_message.Message):
    __slots__ = ("red", "blue")
    RED_FIELD_NUMBER: _ClassVar[int]
    BLUE_FIELD_NUMBER: _ClassVar[int]
    red: int
    blue: int
    def __init__(self, red: _Optional[int] = ..., blue: _Optional[int] = ...) -> None: ...
