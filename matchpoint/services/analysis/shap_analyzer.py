# bbe/matchpoint/services/analysis/shap_analyzer.py
import pandas as pd
from ...models.model_loader import loader
from ...domain.prediction import ShapResult

class ShapAnalyzer:
    """
    A utility class for performing SHAP (SHapley Additive exPlanations) analysis.
    """
    
    @staticmethod
    def get_shap_analysis(features_df: pd.DataFrame, team_mapping: dict = None) -> ShapResult:
        """
        Calculates and formats SHAP values for a single prediction.

        Args:
            features_df (pd.DataFrame): DataFrame containing the features
            team_mapping (dict): Optional mapping of alliance positions to team numbers

        Returns:
            ShapResult: A data object containing the base value, SHAP values,
                        feature names, and their corresponding data.
        """
        # The explainer is already loaded in the 'loader' instance
        explainer = loader.shap_explainer
        
        # Calculate SHAP values
        explanation = explainer(features_df)
        
        # Extract data for the first prediction
        base_value = float(explanation[0].base_values)
        values = explanation[0].values.tolist()
        feature_data = explanation[0].data.tolist()
        feature_names = features_df.columns.tolist()
        
        # Replace alliance positions with team numbers if mapping is provided
        if team_mapping:
            new_feature_names = []
            for feature in feature_names:
                for position, team in team_mapping.items():
                    if feature.startswith(position + "_"):
                        alliance_color = position.replace("1", "").replace("2", "").replace("3", "")
                        feature = feature.replace(position + "_", f"{alliance_color}_{team}_")
                        break
                new_feature_names.append(feature)
            feature_names = new_feature_names
        
        return ShapResult(
            base_value=base_value,
            values=values,
            feature_names=feature_names,
            feature_data=feature_data
        )