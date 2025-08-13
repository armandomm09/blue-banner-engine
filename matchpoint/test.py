import json
from matchpoint.services import Simulator
from time import time

sim = Simulator()

initial = time()
alliance = sim.simulate_n_playoffs("2025iri", 1000)
end_time = time() - initial

print(alliance)
print(end_time)

# 3.0652077198028564
# import json
# from matchpoint.third_parties.tba import TBAService

# tba = TBAService()

# # oprs = tba.get_tba_oprs_event("2025mxle")

# # print(json.dumps(oprs))

# oprs_single = tba.get_all_tba_stats_for_event_from_single_call("2025mxle", ("5887", "3478"))
# oprs_concurren = tba.get_all_tba_stats_for_event_concurrently("2025mxle", ("5887", "3478"))

# #order them by keys and check if they are the same
# oprs_single = dict(sorted(oprs_single.items()))
# oprs_concurren = dict(sorted(oprs_concurren.items()))


# print(oprs_single)
# print(oprs_concurren)
# print(oprs_single == oprs_concurren)