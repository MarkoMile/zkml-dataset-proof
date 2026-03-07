// src/setup.ts
// Four Poseidon commitments (NO domain tags, NO salts):
//   1) rho (Merkle root)
//   2) deltaW = w0 - w1
//   3) B = deltaW * v  where v = Poseidon([sigma, rho])
//   4) sigma
//
// Returns:
//   { commitments: string[], witnesses: string[] }  // aligned by index
//
// Inputs expected (JSON written by your other scripts):
//   - AP.json       -> { m: { rho }, sigma, ... }
//   - trained_model.json    -> { weight: w1, [w0?], ... }   (w0 defaults to 0)
//
// Dependencies:
//   npm i @iden3/js-crypto

import fs from "fs";
import path from "path";
import { Poseidon } from "@iden3/js-crypto";

// BN254 field prime (same curve family used by @iden3 poseidon)
const P =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// ---------- helpers ----------
function modP(x: bigint): bigint {
  const r = x % P;
  return r >= 0n ? r : r + P;
}

function toBigIntSafe(x: unknown): bigint {
  if (typeof x === "bigint") return modP(x);
  if (typeof x === "number") return modP(BigInt(Math.trunc(x)));
  if (typeof x === "string") {
    const s = x.trim();
    const bi = s.startsWith("0x") ? BigInt(s) : BigInt(s);
    return modP(bi);
  }
  throw new Error(`Cannot convert to BigInt: ${x}`);
}

// Poseidon hash of field elements (returns field element)
function H(inputs: bigint[]): bigint {
  return modP(Poseidon.hash(inputs));
}

// ---------- load inputs ----------
const apPath = path.resolve("AP.json");
if (!fs.existsSync(apPath)) {
  throw new Error(`AP.json not found at ${apPath}. Run build_ap.ts first.`);
}
const ap = JSON.parse(fs.readFileSync(apPath, "utf8"));
const rho = toBigIntSafe(ap?.m?.rho);
const sigma = toBigIntSafe(ap?.sigma);

const modelCandidates = [path.resolve("trained_model.json"), path.resolve("modelParams.json")];
let modelRaw: any = null;
for (const cand of modelCandidates) {
  if (fs.existsSync(cand)) {
    modelRaw = JSON.parse(fs.readFileSync(cand, "utf8"));
    break;
  }
}
if (!modelRaw) {
  throw new Error(
    `Model JSON not found. Expected one of: ${modelCandidates.join(", ")}.`
  );
}
const w1 = toBigIntSafe(modelRaw?.weight);
const w0 = modelRaw?.w0 !== undefined ? toBigIntSafe(modelRaw.w0) : 0n;

// ---------- compute commitments first ----------
const deltaW = modP(w0 - w1);
const C_rho = H([rho]);
const C_deltaW = H([deltaW]);
const C_sigma = H([sigma]);

// ---------- Fiat-Shamir challenge v ----------
// v = Poseidon([C_rho, C_deltaW, C_sigma])
const v = H([C_rho, C_deltaW, C_sigma]);

// ---------- compute B and its commitment ----------
const B = modP(deltaW * v);
const C_B = H([B]);

export type SetupResult = {
  commitments: string[]; // [C_rho, C_deltaW, C_B, C_sigma]
  witnesses: string[];   // [rho, deltaW, B, sigma]
};

export function setup(): SetupResult {
  return {
    commitments: [C_rho, C_deltaW, C_B, C_sigma].map(String),
    witnesses: [rho, deltaW, B, sigma].map(String),
  };
}

// Allow running directly to produce a helper artifact
if (import.meta.url === `file://${process.argv[1]}`) {
  const out = setup();
  fs.writeFileSync(
    path.resolve("setup_out.json"),
    JSON.stringify(out, null, 2),
    "utf8"
  );
  console.log("✅ setup complete. Wrote setup_out.json");
  console.log("commitments:", out.commitments);
  console.log("witnesses  :", out.witnesses);
}
