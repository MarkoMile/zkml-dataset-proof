import json

# Field modulus – BN254 prime number.
prime = 21888242871839275222246405745257275088548364400416034343698204186575808495617

class Element:
    def __init__(self, value=0):
        self.value = value % prime

    def __add__(self, other):
        if isinstance(other, Element):
            return Element(self.value + other.value)
        else:
            return Element(self.value + other)
    __radd__ = __add__

    def __mul__(self, other):
        if isinstance(other, Element):
            return Element(self.value * other.value)
        else:
            return Element(self.value * other)
    __rmul__ = __mul__

    def __pow__(self, exponent):
        return Element(pow(self.value, exponent, prime))

    def __repr__(self):
        return f"Element({self.value})"

def zero():
    return Element(0)

NROUNDSF = 8
NROUNDSP = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68]

def exp5(a):
    a.value = pow(a.value, 5, prime)

def exp5state(state):
    for a in state:
        exp5(a)

def ark(state, c, it):
    for i in range(len(state)):
        state[i].value = (state[i].value + c[it + i].value) % prime

def mix(state, t, m):
    new_state = [zero() for _ in range(t)]
    for i in range(len(state)):
        for j in range(len(state)):
            new_state[i] = new_state[i] + (m[j][i] * state[j])
    return new_state

def json_to_element(obj):
    if isinstance(obj, list):
        return [json_to_element(x) for x in obj]
    elif isinstance(obj, str):
        try:
            return Element(int(obj, 10))
        except ValueError:
            return Element(int(obj, 16))
    else:
        return Element(int(obj))

def read_file(name):
    with open(f'./constants/{name}.json', 'r') as file:
        data = json.load(file)
    return json_to_element(data)

c = {
    'C': read_file("C"),
    'S': read_file("S"),
    'M': read_file("M"),
    'P': read_file("P")
}

def hash_with_state_ex(inpBI, initState, nOuts):
    
    t = len(inpBI) + 1
    if len(inpBI) == 0 or len(inpBI) > len(NROUNDSP):
        raise ValueError(f"invalid inputs length {len(inpBI)}, max {len(NROUNDSP)}")
    if nOuts < 1 or nOuts > t:
        raise ValueError(f"invalid nOuts {nOuts}, min 1, max {t}")
    
    for x in inpBI:
        if x < 0 or x >= prime:
            raise ValueError("input value not in field")
    
    inp = [Element(x) for x in inpBI]

    nRoundsF = NROUNDSF
    nRoundsP = NROUNDSP[t - 2]
    
    C = c['C'][t - 2]
    S = c['S'][t - 2]
    M = c['M'][t - 2]
    P = c['P'][t - 2]

    state = [None] * t
    if initState < 0 or initState >= prime:
        raise ValueError("initState not in field")
    state[0] = Element(initState)
    for i in range(len(inp)):
        state[i + 1] = inp[i]

    ark(state, C, 0)

    for i in range(nRoundsF // 2 - 1):
        exp5state(state)
        ark(state, C, (i + 1) * t)
        state = mix(state, t, M)

    exp5state(state)
    ark(state, C, (nRoundsF // 2) * t)
    state = mix(state, t, P)

    for i in range(nRoundsP):
        exp5(state[0])
        state[0].value = (state[0].value + C[(nRoundsF // 2 + 1) * t + i].value) % prime

        new_state0 = zero()
        for j in range(len(state)):
            new_state0 = new_state0 + (S[(t * 2 - 1) * i + j] * state[j])

        for k in range(1, t):
            state[k] = state[k] + (state[0] * S[(t * 2 - 1) * i + t + k - 1])
        state[0] = new_state0

    for i in range(nRoundsF // 2 - 1):
        exp5state(state)
        ark(state, C, (nRoundsF // 2 + 1) * t + nRoundsP + i * t)
        state = mix(state, t, M)

    exp5state(state)
    state = mix(state, t, M)

    return [s.value for s in state[:nOuts]]

def hash_with_state(inpBI, initState):
    result = hash_with_state_ex(inpBI, initState, 1)
    return result[0]

def poseidon_hash(inpBI):
    return hash_with_state(inpBI, 0)

def poseidon_hash_ex(inpBI, nOuts):
    return hash_with_state_ex(inpBI, 0, nOuts)

if __name__ == '__main__':
    inputs = [16695921504346203620402905961257377471953351633387377477431034066224029724381, 1, 8512171, 93]
    try:
        h = poseidon_hash(inputs)
        print("Poseidon hash output:", hex(h))
    except ValueError as e:
        print("Error:", e)
