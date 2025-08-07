import csv, json, math, argparse, pickle, pathlib
from typing import List
from poseidon_py import poseidon_hash


YESNO   = {"yes": 1, "no": 0}
FURNISH = {"unfurnished": 0, "semi-furnished": 1, "furnished": 2}

def parse_row(row: List[str]) -> List[int]:
    price, area, bedrooms, bathrooms, stories = map(int, row[:5])

    mainroad          = YESNO[row[5].strip()]
    guestroom         = YESNO[row[6].strip()]
    basement          = YESNO[row[7].strip()]
    hotwaterheating   = YESNO[row[8].strip()]
    airconditioning   = YESNO[row[9].strip()]
    parking           = int(row[10])

    prefarea          = YESNO[row[11].strip()]
    furnishingstatus  = FURNISH[row[12].strip()]

    return [
        price, area, bedrooms, bathrooms, stories,
        mainroad, guestroom, basement, hotwaterheating,
        airconditioning, parking, prefarea, furnishingstatus,
    ]

def poseidon_leaf(ints: List[int]) -> int:
    """Vrati Poseidon hash (kao int) liste field-elemenata."""
    return poseidon_hash(ints)

def hash_pair(left: int, right: int) -> int:
    return poseidon_hash([left, right])

class Merkle:
    def __init__(self, leaves: List[int]):
        self.depth = math.ceil(math.log2(len(leaves)))
        size       = 1 << self.depth
        leaves    += [leaves[-1]] * (size - len(leaves))
        self.layers: List[List[int]] = [leaves]
        while len(self.layers[-1]) > 1:
            cur = self.layers[-1]
            nxt = [hash_pair(cur[i], cur[i+1]) for i in range(0, len(cur), 2)]
            self.layers.append(nxt)

    @property
    def root(self) -> int:
        return self.layers[-1][0]

    def path(self, idx: int):
        sibs, dirs = [], []
        for d in range(self.depth):
            layer = self.layers[d]
            left  = idx % 2 == 0
            sibs.append(layer[idx + 1] if left else layer[idx - 1])
            dirs.append(0 if left else 1)
            idx //= 2
        return sibs, dirs

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="data.csv", help="path to CSV file")
    ap.add_argument("--sample-index", type=int, default=0, help="which row to use for witness")
    args = ap.parse_args()

    # load data
    rows = [parse_row(r) for r in csv.reader(open(args.csv))]
    if not (0 <= args.sample_index < len(rows)):
        raise ValueError("sample-index out of range")

    # list hashes
    leaves = [poseidon_leaf(r) for r in rows]

    # tree
    tree  = Merkle(leaves)
    root  = tree.root

    # witness for selected example
    sample_x = rows[args.sample_index][:-1]   # first 12 features
    sample_y = rows[args.sample_index][-1]    # label (furnishingstatus)
    sibs, dirs = tree.path(args.sample_index)

    witness = {
        "root": hex(root),
        "sample": {
            "x": [str(v) for v in sample_x],
            "y": str(sample_y)
        },
        "path": {
            "siblings": [hex(s) for s in sibs],
            "directions": dirs
        }
    }

    pathlib.Path("scripts").mkdir(exist_ok=True)
    with open("scripts/witness.json", "w") as f:
        json.dump(witness, f, indent=2)
    with open("scripts/merkle.pkl", "wb") as f:
        pickle.dump(tree, f)

    print("✔  witness.json is created   (root =", hex(root) + ")")

if __name__ == "__main__":
    main()
