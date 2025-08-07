# bbe/matchpoint/services/analysis/shap_analyzer.py
import pandas as pd
from ...models.model_loader import loader
from ...domain.prediction import ShapResult

class ShapAnalyzer:
    """
    A utility class for performing SHAP (SHapley Additive exPlanations) analysis.
    """
    
    @staticmethod
    def get_shap_analysis(features_df: pd.DataFrame) -> ShapResult:
        """
        Calculates and formats SHAP values for a single prediction.

        Args:
            features_df (pd.DataFrame): A DataFrame containing the single row of
                                        features for which to calculate SHAP values.

        Returns:
            ShapResult: A data object containing the base value, SHAP values,
                        feature names, and their corresponding data.
        """
        # The explainer is already loaded in the 'loader' instance
        explainer = loader.shap_explainer
        
        # Calculate SHAP values. The result is a SHAP Explanation object.
        explanation = explainer(features_df)
        
        # Extract data for the first (and only) prediction in the batch
        # Convert NumPy arrays to native Python lists for serialization
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