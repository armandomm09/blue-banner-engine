import xgboost as xgb
from .. import config 

class ModelLoader:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            
            cls._instance.classifier = xgb.XGBClassifier()
            cls._instance.classifier.load_model(config.CLASSIFIER_PATH)

            cls._instance.red_regressor = xgb.XGBRegressor()
            cls._instance.red_regressor.load_model(config.RED_REGRESSOR_PATH)

            cls._instance.blue_regressor = xgb.XGBRegressor()
            cls._instance.blue_regressor.load_model(config.BLUE_REGRESSOR_PATH)
            
        return cls._instance

loader = ModelLoader()