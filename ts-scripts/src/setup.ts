// src/setup.ts
// Four Poseidon commitments (NO domain tags, NO salts):
//   1) rho (Merkle root)
//   2) deltaW = w0 - w1
//   3) B = deltaW * v  where v = Poseidon([sigma, rho])
//   4) sigma
//
// Outputs:
//   - setup_out.json  => { commitments: string[], witnesses: string[] }
//   - Prover.toml     => commitments=[...] ; witnesses=[...]
//
// Inputs:
//   - AP.json               -> { m: { rho }, sigma, ... }
//   - trained_model.json    -> { weight: w1, [w0?], ... }   (w0 defaults to 0)
//
// deps: npm i @iden3/js-crypto

import fs from "fs";
import path from "path";
import { Poseidon } from "@iden3/js-crypto";

// BN254 prime
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
  const out = Poseidon.hash(inputs);
  return modP(typeof out === "bigint" ? out : BigInt(out));
}

// ---------- main ----------
async function run() {
  // Load AP.json
  const apPath = path.resolve("AP.json");
  if (!fs.existsSync(apPath)) {
    throw new Error(`AP.json not found at ${apPath}. Run build_ap.ts first.`);
    }
  const ap = JSON.parse(fs.readFileSync(apPath, "utf8"));
  const rho = toBigIntSafe(ap?.m?.rho);
  const sigma = toBigIntSafe(ap?.sigma);

  // Load model
  const modelCandidates = [
    path.resolve("trained_model.json"),
    path.resolve("modelParams.json"),
  ];
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

  // Compute deltaW, v, B
  const deltaW = modP(w0 - w1);
  const v = H([sigma, rho]);          // simple challenge
  const B = modP(deltaW * v);         // binding scalar

  // Commitments
  const C_rho = H([rho]);
  const C_deltaW = H([deltaW]);
  const C_B = H([B]);
  const C_sigma = H([sigma]);

  const commitments = [C_rho, C_deltaW, C_B, C_sigma].map((x) => x.toString());
  const witnesses   = [rho,   deltaW,   B,   sigma].map((x) => x.toString());

  // Write setup_out.json
  const outJson = { commitments, witnesses };
  fs.writeFileSync(
    path.resolve("setup_out.json"),
    JSON.stringify(outJson, null, 2),
    "utf8"
  );

  // Write Prover.toml (minimal)
  const toTomlArray = (arr: string[]) =>
    "[" + arr.map((s) => JSON.stringify(s)).join(", ") + "]";
  const toml = `commitments = ${toTomlArray(commitments)}
witnesses   = ${toTomlArray(witnesses)}
`;
  fs.writeFileSync(path.resolve("Prover.toml"), toml, "utf8");

  console.log("✅ setup complete.");
  console.log("• commitments:", commitments);
  console.log("• witnesses  :", witnesses);
}

// Always run (no brittle import.meta.url check)
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
