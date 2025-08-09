from matchpoint.services import Simulator
from time import time

sim = Simulator()

initial = time()
alliance = sim.simulate_n_playoffs("2025mxle", 1000)
end_time = time() - initial

print(alliance)
print(end_time)