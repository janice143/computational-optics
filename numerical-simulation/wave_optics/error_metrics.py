import numpy as np


def mean_squared_error(a, b):
    return np.mean(np.abs(a - b) ** 2)

