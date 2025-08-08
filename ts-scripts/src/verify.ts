import fs from "fs";
import { parse } from "csv-parse/sync";
import * as bls from "@noble/bls12-381";
import { Poseidon } from "@iden3/js-crypto";

// BN254 mod
const P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const SCALE = 1_000_000;

function stringToFieldLimbs(s: string): bigint[] {
  const bytes = Buffer.from(s, "utf8");
  const limbs: bigint[] = [];
  const LIMB = 31;
  for (let i = 0; i < bytes.length; i += LIMB) {
    const bi = BigInt("0x" + bytes.subarray(i, i + LIMB).toString("hex")) % P;
    limbs.push(bi);
  }
  return limbs.length ? limbs : [0n];
}
function valueToFieldElems(v: string): bigint[] {
  const n = Number(v);
  if (!Number.isNaN(n) && Number.isFinite(n)) {
    let bi = BigInt(Math.round(n * SCALE));
    bi = ((bi % P) + P) % P;
    return [bi];
  }
  return stringToFieldLimbs(v);
}
function rowToFieldElems(row: string[]): bigint[] {
  const out: bigint[] = [];
  for (const c of row) for (const e of valueToFieldElems(c)) out.push(e);
  return out.length ? out : [0n];
}
function poseidonHash(inputs: bigint[]): bigint {
  const out = Poseidon.hash(inputs as unknown as bigint[]);
  const bi = typeof out === "bigint" ? out : BigInt(out);
  return bi % P;
}
function canonicalize(records: string[][]) {
  const hdr = records[0];
  const idx = hdr.map((_, i) => i).sort((a, b) => hdr[a].localeCompare(hdr[b]));
  return {
    header: idx.map(i => hdr[i]),
    rows: records.slice(1).map(r => idx.map(i => r[i] ?? "")),
  };
}
function merkleRoot(leaves: bigint[]): bigint {
  if (!leaves.length) throw new Error("No leaves");
  let lvl = leaves.slice();
  while (lvl.length > 1) {
    if (lvl.length % 2) lvl = lvl.concat(lvl[lvl.length - 1]);
    const next: bigint[] = [];
    for (let i = 0; i < lvl.length; i += 2) next.push(poseidonHash([lvl[i], lvl[i + 1]]));
    lvl = next;
  }
  return lvl[0];
}

(async () => {
  const ap = JSON.parse(fs.readFileSync("AP.json", "utf8"));
  const csvRaw = fs.readFileSync("dataset.csv", "utf8");
  const recs: string[][] = parse(csvRaw, { skip_empty_lines: true });
  const { rows } = canonicalize(recs);

  const leaves = rows.map(r => poseidonHash(rowToFieldElems(r)));
  const rho2 = merkleRoot(leaves);
  const rhoHex = "0x" + rho2.toString(16);
  if (rhoHex !== ap.mi.rho) throw new Error("Merkle root mismatch!");

  const miBytes = Buffer.from(JSON.stringify(ap.mi, Object.keys(ap.mi).sort()), "utf8");
  const sig = Buffer.from(ap.sigma.slice(2), "hex");
  const pk = Buffer.from(ap.pp.pk_ca.slice(2), "hex");
  const ok = await bls.verify(sig, miBytes, pk);
  if (!ok) throw new Error("BLS signature invalid!");

  console.log("✅ AP verified: rho matches & BLS valid.");
})();
