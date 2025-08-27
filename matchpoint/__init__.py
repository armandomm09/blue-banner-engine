# Package level imports
from .third_parties.fetcher import Fetcher
from .services import MatchpointPredictor
from . import server

# Define what should be available when someone does 'from matchpoint import *'
__all__ = [
    'Fetcher',
    'MatchpointPredictor',
    'server'
]

# You can also add package metadata
__version__ = '0.1.0'
__author__ = 'Armando Mac Beath'