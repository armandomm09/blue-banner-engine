# bbe/matchpoint/services/analysis/shap_analyzer.py
import pandas as pd
from ...models.model_loader import loader
from ...domain.prediction import ShapResult

class ShapAnalyzer:
    def get_shap_analysis(features_df: pd.DataFrame) -> ShapResult:
        """Calcula y formatea los valores SHAP para una sola predicción."""
        # El explainer ya está cargado en la instancia 'loader'
        explainer = loader.shap_explainer
        
        # Calcula los valores SHAP. El resultado es un objeto Explanation.
        explanation = explainer(features_df)
        
        # Extrae los datos para la primera (y única) predicción en el lote
        # Convierte los arrays de NumPy a listas de Python para serialización
        base_value = float(explanation[0].base_values)
        values = explanation[0].values.tolist()
        feature_data = explanation[0].data.tolist()
        feature_names = features_df.columns.tolist()
        
        return ShapResult(
            base_value=base_value,
            values=values,
            feature_names=feature_names,
            feature_data=feature_data
        )