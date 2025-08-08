import os, csv, json, math, argparse, pickle, pathlib, sys
from typing import List, Dict, Tuple

try:
    import poseidon
except ImportError as e:
    print("✖ Nemam 'poseidon' modul pored skripte (poseidon.py).", file=sys.stderr)
    raise

def reload_poseidon_constants(constants_dir: str = "constants") -> None:
    """
    Učitaj C/M/P/S iz JSON-ova i podesi u 'poseidon' modulu.
    Ovo obezbeđuje identične runde/konstante kao Noir/Barretenberg.
    """
    def load_json(name: str):
        path = os.path.join(constants_dir, name)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Nije nađen '{path}'")
        with open(path, "r") as fh:
            return json.load(fh)

    C_raw = load_json("C.json")
    M_raw = load_json("M.json")
    P_raw = load_json("P.json")
    S_raw = load_json("S.json")

    # Ako poseidon.py ima helper za konverziju u field elemente – iskoristi ga.
    if hasattr(poseidon, "json_to_element"):
        C = poseidon.json_to_element(C_raw)
        M = poseidon.json_to_element(M_raw)
        P = poseidon.json_to_element(P_raw)
        S = poseidon.json_to_element(S_raw)
    else:
        # fallback: ostavi kako jeste; mnoge implementacije već očekuju nizove int-ova
        C, M, P, S = C_raw, M_raw, P_raw, S_raw

    # Većina javnih varijanti čuva konstante u 'poseidon.c'
    # Ako je drugačije, prilagodi po tvom poseidon.py
    poseidon.c = {"C": C, "M": M, "P": P, "S": S}

# ─────────────────────────────────────────────────────────────
# 2) Heš helperi i field parametar
# ─────────────────────────────────────────────────────────────
def field_prime() -> int:
    for attr in ("prime", "FIELD_MODULUS", "MODULUS"):
        if hasattr(poseidon, attr):
            return int(getattr(poseidon, attr))
    raise RuntimeError("Nisam našao polje (prime) u poseidon modulu.")

p = field_prime()

def poseidon_leaf(vals: List[int]) -> int:
    # Heš celog reda: Poseidon(v0, v1, ..., vk)
    return int(poseidon.poseidon_hash(vals)) % p

def poseidon_pair(left: int, right: int) -> int:
    # Heš roditelja: Poseidon(left, right)
    return int(poseidon.poseidon_hash([left % p, right % p])) % p

# ─────────────────────────────────────────────────────────────
# 3) Parsiranje CSV-a (auto-šema): HOUSE (13 kolona) ili PATIENT (imenovane)
# ─────────────────────────────────────────────────────────────
YESNO   = {"yes": 1, "no": 0}
FURNISH = {"unfurnished": 0, "semi-furnished": 1, "furnished": 2}

def parse_house_row(row: List[str]) -> List[int]:
    """
    House schema (13 kolona, u fiksnom redosledu)
    price, area, bedrooms, bathrooms, stories,
    mainroad, guestroom, basement, hotwaterheating,
    airconditioning, parking, prefarea, furnishingstatus
    """
    price, area, bedrooms, bathrooms, stories = map(int, row[:5])

    mainroad        = YESNO[row[5].strip()]
    guestroom       = YESNO[row[6].strip()]
    basement        = YESNO[row[7].strip()]
    hotwaterheating = YESNO[row[8].strip()]
    aircond         = YESNO[row[9].strip()]
    parking         = int(row[10])
    prefarea        = YESNO[row[11].strip()]
    furnishing      = FURNISH[row[12].strip()]

    vals = [
        price, area, bedrooms, bathrooms, stories,
        mainroad, guestroom, basement, hotwaterheating,
        aircond, parking, prefarea, furnishing,
    ]
    # svi su već << p, ali da budemo dosledni:
    return [v % p for v in vals]

def parse_patient_row(row: Dict[str, str]) -> List[int]:
    """
    Patient schema (sa imenima kolona):
    pol, starost, pritisak, holesterol, dijagnoza
    pritisak/holesterol očekujemo float → skaliramo * 1000, pa int
    """
    if not all(row.get(k) not in (None, "") for k in ("pol","starost","pritisak","holesterol","dijagnoza")):
        raise ValueError("Nedostaju polja u patient redu.")

    pol        = int(row["pol"])
    starost    = int(row["starost"])
    pritisak   = int(float(row["pritisak"]) * 1000)
    holesterol = int(float(row["holesterol"]) * 1000)
    dijagnoza  = int(row["dijagnoza"])

    return [v % p for v in [pol, starost, pritisak, holesterol, dijagnoza]]

def load_rows_auto(csv_path: str) -> Tuple[List[List[int]], str]:
    """
    Pokuša DictReader (patient). Ako ne odgovara – vrati house reading.
    Vraća: (rows_as_int_lists, schema_name)
    """
    with open(csv_path, newline="") as f:
        # Probaj kao patient (sa headerima)
        sniffer = csv.Sniffer()
        sample = f.read(4096)
        f.seek(0)
        has_header = sniffer.has_header(sample)
        if has_header:
            reader = csv.DictReader(f)
            headers = [h.strip().lower() for h in (reader.fieldnames or [])]
            need = {"pol","starost","pritisak","holesterol","dijagnoza"}
            if need.issubset(set(headers)):
                rows = []
                for r in reader:
                    try:
                        rows.append(parse_patient_row({k.strip().lower(): v for k,v in r.items()}))
                    except Exception:
                        continue
                if rows:
                    return rows, "patient"

        # Ako nije patient, čitaj kao house (prvi red header pa data)
        f.seek(0)
        reader2 = csv.reader(f)
        next(reader2, None)  # skip header
        rows = [parse_house_row(r) for r in reader2 if r and len(r) >= 13]
        if not rows:
            raise ValueError("CSV ne liči ni na 'patient' ni na 'house' dataset.")
        return rows, "house"

# ─────────────────────────────────────────────────────────────
# 4) Merkle stablo (Poseidon kao hash para)
# ─────────────────────────────────────────────────────────────
class Merkle:
    def __init__(self, leaves: List[int]):
        if len(leaves) == 0:
            raise ValueError("Nema listova.")
        if len(leaves) == 1:
            leaves = leaves + leaves
        self.depth = math.ceil(math.log2(len(leaves)))
        size       = 1 << self.depth
        leaves     = leaves + [leaves[-1]] * (size - len(leaves))  # pad zadnjim listom
        self.layers: List[List[int]] = [leaves]
        while len(self.layers[-1]) > 1:
            cur = self.layers[-1]
            nxt = [poseidon_pair(cur[i], cur[i+1]) for i in range(0, len(cur), 2)]
            self.layers.append(nxt)

    @property
    def root(self) -> int:
        return self.layers[-1][0]

    def path(self, idx: int) -> Tuple[List[int], List[int]]:
        """
        Merkle dokaz: siblings i directions
        directions: 0 -> naš čvor je levo; 1 -> desno
        redosled: od dna (list) ka vrhu (root)
        """
        if not (0 <= idx < len(self.layers[0])):
            raise IndexError("idx van opsega listova")
        sibs, dirs = [], []
        cur_idx = idx
        for level in range(self.depth):
            layer = self.layers[level]
            is_left = (cur_idx % 2 == 0)
            sib = layer[cur_idx + 1] if is_left else layer[cur_idx - 1]
            sibs.append(sib)
            dirs.append(0 if is_left else 1)
            cur_idx //= 2
        return sibs, dirs

# ─────────────────────────────────────────────────────────────
# 5) CLI & upis fajlova
# ─────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True, help="putanja do CSV fajla (house ili patient)")
    ap.add_argument("--sample-index", type=int, default=0, help="red za koga se pravi inputs (witness-ulazi)")
    ap.add_argument("--const-dir", default="constraints", help="folder sa C/M/P/S JSON-ovima (Noir kompatibilni)")
    args = ap.parse_args()

    # 5.1 – učitaj konstante za Poseidon
    reload_poseidon_constants(args.const_dir)

    # 5.2 – učitaj redove (auto schema)
    rows, schema = load_rows_auto(args.csv)

    if not (0 <= args.sample_index < len(rows)):
        raise ValueError(f"--sample-index mora biti u [0, {len(rows)-1}]")

    # 5.3 – heširaj listove i izgradi stablo
    leaves = [poseidon_leaf(r) for r in rows]
    tree   = Merkle(leaves)

    # 5.4 – pripremi ulaze za jedan uzorak
    sample = rows[args.sample_index]
    x, y   = sample[:-1], sample[-1]
    sibs, dirs = tree.path(args.sample_index)

    inputs = {
        "dataset_root": hex(tree.root),           # public u cirkuitu
        "x": [str(v) for v in x],                 # privatno: featuri uzorka
        "y": str(y),                              # privatno: label
        "sibs": [hex(s) for s in sibs],           # privatno: siblings po nivou
        "dirs": dirs                              # privatno: 0/1 (levo/desno)
    }

    out_dir = pathlib.Path("preprocessing")
    out_dir.mkdir(exist_ok=True)

    # 5.5 – snimi ulaze, listu leaf-ova i root
    (out_dir / "inputs.json").write_text(json.dumps(inputs, indent=2))
    with open(out_dir / "leaf_hashes.txt", "w") as fh:
        for h in leaves:
            fh.write(hex(h) + "\n")
    (out_dir / "root.txt").write_text(hex(tree.root) + "\n")

    # 5.6 – opcioni TOML (ako koristiš nargo sa toml ulazima)
    toml_lines = []
    toml_lines.append(f'dataset_root = "{hex(tree.root)}"')
    toml_lines.append("x = [" + ", ".join(f'"{v}"' for v in inputs["x"]) + "]")
    toml_lines.append(f'y = "{inputs["y"]}"')
    toml_lines.append("sibs = [" + ", ".join(f'"{s}"' for s in inputs["sibs"]) + "]")
    toml_lines.append("dirs = [" + ", ".join(str(d) for d in inputs["dirs"]) + "]")
    (out_dir / "Prover.toml").write_text("\n".join(toml_lines) + "\n")

    # 5.7 – pickle radi debug-a
    with open(out_dir / "merkle.pkl", "wb") as fh:
        pickle.dump(tree, fh)

    print(f"✔ schema: {schema}")
    print(f"✔ root   : {hex(tree.root)}")
    print(f"✔ depth  : {len(sibs)} (pošto je #listova→pad na 2^k)")
    print("✔ files  :")
    print("   -", (out_dir / "inputs.json").resolve())
    print("   -", (out_dir / "leaf_hashes.txt").resolve())
    print("   -", (out_dir / "root.txt").resolve())
    print("   -", (out_dir / "Prover.toml").resolve())
    print("   -", (out_dir / "merkle.pkl").resolve())

if __name__ == "__main__":
    main()
