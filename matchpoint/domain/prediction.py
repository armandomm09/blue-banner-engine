

from dataclasses import dataclass, field
from typing import Dict

@dataclass(frozen=True) 
class MatchPrediction:
    """
    Representa el resultado de una predicción completa para un solo partido.
    """
    match_key: str
    predicted_winner: str
    win_probability: Dict[str, float] = field(default_factory=dict)
    predicted_scores: Dict[str, int] = field(default_factory=dict)

    def __str__(self) -> str:
        """
        Devuelve una representación en string, legible por humanos, de la predicción.
        """
        
        winner_prob = self.win_probability.get(self.predicted_winner, 0.0)
        
        
        output = []
        output.append(f"--- Predicción para {self.match_key} ---")
        output.append(f"Ganador Predicho: {self.predicted_winner.upper()} (Confianza: {winner_prob:.2%})")
        output.append("  Puntajes Estimados:")
        output.append(f"    - Azul: {self.predicted_scores.get('blue', 'N/A')}")
        output.append(f"    - Rojo: {self.predicted_scores.get('red', 'N/A')}")
        output.append("  Probabilidades Detalladas:")
        output.append(f"    - Azul: {self.win_probability.get('blue', 0.0):.2%}")
        output.append(f"    - Rojo: {self.win_probability.get('red', 0.0):.2%}")
        
        return "\n".join(output)

    def to_dict(self) -> Dict:
        """Convierte el objeto a un diccionario, útil para serialización (ej. JSON)."""
        return {
            "match_key": self.match_key,
            "predicted_winner": self.predicted_winner,
            "win_probability": self.win_probability,
            "predicted_scores": self.predicted_scores
        }