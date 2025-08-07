import csv, json, math, argparse, pickle, pathlib
from typing import List
from poseidon_py import poseidon_hash           # BN254 kao i kod Noir-a

# mapiramo teks -> int
YESNO   = {"yes": 1, "no": 0}
FURNISH = {"unfurnished": 0, "semi-furnished": 1, "furnished": 2}

def parse_row(row: List[str]) -> List[int]:
    """13 stringova  ->  13 integera (< p)"""
    price, area, bedrooms, bathrooms, stories = map(int, row[:5])

    mainroad        = YESNO[row[5].strip()]
    guestroom       = YESNO[row[6].strip()]
    basement        = YESNO[row[7].strip()]
    hotwaterheating = YESNO[row[8].strip()]
    aircond         = YESNO[row[9].strip()]
    parking         = int(row[10])

    prefarea        = YESNO[row[11].strip()]
    furnishing      = FURNISH[row[12].strip()]

    return [
        price, area, bedrooms, bathrooms, stories,
        mainroad, guestroom, basement, hotwaterheating,
        aircond, parking, prefarea, furnishing,
    ]

def leaf_hash(vals: List[int]) -> int:
    """Poseidon(v0 ... v12 )"""
    return poseidon_hash(vals)

def hash_pair(l: int, r: int) -> int:
    """Internal node Poseidon( l , r )"""
    return poseidon_hash([l, r])

class Merkle:
    def __init__(self, leaves: List[int]):
        self.depth = math.ceil(math.log2(len(leaves)))      # k takvo da 2^k ≥ n
        size       = 1 << self.depth
        leaves    += [leaves[-1]] * (size - len(leaves))     # pad zadnjim listom
        self.layers: List[List[int]] = [leaves]
        while len(self.layers[-1]) > 1:
            cur = self.layers[-1]
            nxt = [hash_pair(cur[i], cur[i+1]) for i in range(0, len(cur), 2)]
            self.layers.append(nxt)

    @property
    def root(self) -> int:
        return self.layers[-1][0]

    def path(self, idx: int):
        """siblings + directions (0-left, 1-right) odozdo nagore"""
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
    ap.add_argument("--csv", default="data.csv")
    ap.add_argument("--sample-index", type=int, default=0)
    args = ap.parse_args()

    with open(args.csv, newline="") as f:
        rdr = csv.reader(f)
        next(rdr)                            # prvi red = nazivi kolona
        rows = [parse_row(r) for r in rdr]

    if not (0 <= args.sample_index < len(rows)):
        raise ValueError("sample-index out of range")

    # List-hash + stablo
    leaves = [leaf_hash(r) for r in rows]
    tree   = Merkle(leaves)

    # Witness za izabrani red
    x = rows[args.sample_index][:-1]              # 12 feature-a
    y = rows[args.sample_index][-1]               # label
    sibs, dirs = tree.path(args.sample_index)

    witness = {
        "root": hex(tree.root),
        "sample": {
            "x": [str(v) for v in x],
            "y": str(y)
        },
        "path": {
            "siblings": [hex(s) for s in sibs],
            "directions": dirs
        }
    }

    out_dir = pathlib.Path("preprocessing")
    out_dir.mkdir(exist_ok=True)

    json.dump(witness, open(out_dir / "witness.json", "w"), indent=2)
    pickle.dump(tree,   open(out_dir / "merkle.pkl",  "wb"))

    print("witness.json -> ", (out_dir / "witness.json").resolve())
    print("  root =", hex(tree.root))

if __name__ == "__main__":
    main()
