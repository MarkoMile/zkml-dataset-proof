// src/build_ap.ts
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { v4 as uuidv4 } from "uuid";
import * as bls from "@noble/bls12-381";
import { Poseidon } from "@iden3/js-crypto";

/* ---------------- types ---------------- */
type PublicParams = {
  curve: "BLS12-381";
  field: "BN254";
  hash: "poseidon";
  kappa1: string;
  kappa2: string;
  kappa3: string;
  pk_ca: string; // hex
};

type Meta = {
  rho: string;                     // hex (field element)
  Att: Record<string, any>;        // semantički atributi
  id: string;                      // UUID
};

type AuthPackage = {
  pp: PublicParams;
  Di: { source: string; nrows: number; columns: string[] };
  mi: Meta;
  sigma: string;                   // hex BLS signature
  Ti: { root: string; leaf_count: number; sample_leaves: string[]; hash: "poseidon"; arity: 2 };
};

/* ------------- field / utils ------------- */
// BN254 modulus
const P =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const toHex = (x: bigint | Uint8Array) =>
  "0x" + (typeof x === "bigint" ? x.toString(16) : Buffer.from(x).toString("hex"));

const randomHex32 = () => toHex(bls.utils.randomPrivateKey());
const stableJson = (obj: unknown) => JSON.stringify(obj, Object.keys(obj as any).sort());

/* ----------- CSV canonicalize ----------- */
function canonicalize(records: string[][]): { header: string[]; rows: string[][] } {
  if (records.length === 0) throw new Error("Empty CSV");
  const header = records[0];
  const idx = header.map((_, i) => i).sort((a, b) => header[a].localeCompare(header[b]));
  const newHeader = idx.map((i) => header[i]);
  const rows = records.slice(1).map(r => idx.map(i => (r[i] ?? "")));
  return { header: newHeader, rows };
}

/* ----------- string/number -> field elems ----------- */
const SCALE = 1_000_000; // 1e6 fixed-point

function stringToFieldLimbs(s: string): bigint[] {
  const bytes = Buffer.from(s, "utf8");
  const limbs: bigint[] = [];
  const LIMB = 31; // 31B = 248b < 254b → < P
  for (let i = 0; i < bytes.length; i += LIMB) {
    const chunk = bytes.subarray(i, i + LIMB);
    const bi = BigInt("0x" + chunk.toString("hex")) % P;
    limbs.push(bi);
  }
  if (limbs.length === 0) limbs.push(0n);
  return limbs;
}

function valueToFieldElems(v: string): bigint[] {
  const num = Number(v);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    let bi = BigInt(Math.round(num * SCALE));
    bi = ((bi % P) + P) % P;
    return [bi];
  }
  return stringToFieldLimbs(v);
}

function rowToFieldElems(row: string[]): bigint[] {
  const out: bigint[] = [];
  for (const cell of row) for (const e of valueToFieldElems(cell)) out.push(e);
  if (out.length === 0) out.push(0n);
  return out;
}

/* ---------------- Poseidon helper ---------------- */
function poseidonHash(inputs: bigint[]): bigint {
  const out = Poseidon.hash(inputs as unknown as bigint[]);
  if (typeof out === "bigint") return out % P;
  if (typeof out === "string") {
    const bi = out.startsWith("0x") ? BigInt(out) : BigInt(out);
    return bi % P;
  }
  throw new Error("Unexpected Poseidon output type");
}

/* ---------------- Merkle (Poseidon) ---------------- */
function buildPoseidonMerkle(leaves: bigint[]): { root: bigint } {
  if (leaves.length === 0) throw new Error("No leaves");
  let level = leaves.slice();
  while (level.length > 1) {
    if (level.length % 2 === 1) level = level.concat(level[level.length - 1]); // dupliraj poslednji
    const next: bigint[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(poseidonHash([level[i], level[i + 1]]));
    }
    level = next;
  }
  return { root: level[0] };
}

/* ---------------- BLS helpers ---------------- */
function hexToBytes(h: string): Uint8Array {
  return new Uint8Array(Buffer.from(h.replace(/^0x/, ""), "hex"));
}

async function blsKeygen(skHex?: string) {
  const sk = skHex ? hexToBytes(skHex) : bls.utils.randomPrivateKey();
  const pk = await bls.getPublicKey(sk);
  return { sk, pk };
}

/* ---------------- Main builder ---------------- */
async function buildAP(csvPath: string, attributes: Record<string, any>, caSkHex?: string): Promise<AuthPackage> {
  // 1) read + canonicalize
  const raw = fs.readFileSync(csvPath, "utf8");
  const records: string[][] = parse(raw, { skip_empty_lines: true });
  const { header, rows } = canonicalize(records);

  // 2) leaves: poseidon(rowFieldElems)
  const leaves: bigint[] = rows.map(r => poseidonHash(rowToFieldElems(r)));

  // 3) Merkle root
  const { root } = buildPoseidonMerkle(leaves);
  const rhoHex = toHex(root);

  // 4) meta m_i
  const mi: Meta = { rho: rhoHex, Att: attributes, id: uuidv4() };
  const miBytes = Buffer.from(stableJson(mi), "utf8");

  // 5) BLS sign
  const { sk, pk } = await blsKeygen(caSkHex);
  const sigma = await bls.sign(miBytes, sk);

  // 6) public params
  const pp: PublicParams = {
    curve: "BLS12-381",
    field: "BN254",
    hash: "poseidon",
    kappa1: randomHex32(),
    kappa2: randomHex32(),
    kappa3: randomHex32(),
    pk_ca: toHex(pk)
  };

  // 7) Ti & Di
  const Ti = {
    root: rhoHex,
    leaf_count: leaves.length,
    sample_leaves: leaves.slice(0, 3).map(toHex),
    hash: "poseidon" as const,
    arity: 2 as const
  };

  const Di = {
    source: path.resolve(csvPath),
    nrows: rows.length,
    columns: header
  };

  return { pp, Di, mi, sigma: toHex(sigma), Ti };
}

/* ---------------- CLI ---------------- */
(async () => {
  try {
    const CSV = "dataset.csv";
    const ATTR = { domain: "housing", country: "US", purpose: "training" };
    const ap = await buildAP(CSV, ATTR);
    fs.writeFileSync("AP.json", JSON.stringify(ap, null, 2));
    console.log("AP.json generated (Poseidon/BN254, BLS12-381).");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
