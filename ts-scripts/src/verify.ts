// src/verify.ts
// Verifikacija minimalnog AP.json
// - Provera Merkle root-a iz dataset-a
// - Provera BLS potpisa nad m (rho)

import fs from "fs";
import * as bls from "@noble/bls12-381";
import { Poseidon } from "@iden3/js-crypto";

const P =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function toField(x: number): bigint {
  let bi = BigInt(Math.round(x));
  bi = ((bi % P) + P) % P;
  return bi;
}

function poseidonHash(inputs: bigint[]): bigint {
  const out = Poseidon.hash(inputs as unknown as bigint[]);
  const bi = typeof out === "bigint" ? out : BigInt(out);
  return bi % P;
}

function merkleRoot(leaves: bigint[]): bigint {
  let lvl = leaves.slice();
  while (lvl.length > 1) {
    if (lvl.length % 2) lvl.push(lvl[lvl.length - 1]);
    const next: bigint[] = [];
    for (let i = 0; i < lvl.length; i += 2) {
      next.push(poseidonHash([lvl[i], lvl[i + 1]]));
    }
    lvl = next;
  }
  return lvl[0];
}

(async () => {
  try {
    const ap = JSON.parse(fs.readFileSync("AP.json", "utf8"));
    const { pk_ca, sigma, dataset, m } = ap;

    // 1) Provera rho iz dataset-a
    const leaves = dataset.rows.map((r: number[]) =>
      poseidonHash(r.map(v => toField(v)))
    );
    const rhoCalc = "0x" + merkleRoot(leaves).toString(16);
    if (rhoCalc !== m.rho) throw new Error("❌ Merkle root mismatch!");
    console.log("✅ Merkle root matches.");

    // 2) Provera potpisa
    const mBytes = Buffer.from(JSON.stringify(m, Object.keys(m).sort()), "utf8");
    const ok = await bls.verify(
      Buffer.from(sigma.replace(/^0x/, ""), "hex"),
      mBytes,
      Buffer.from(pk_ca.replace(/^0x/, ""), "hex")
    );

    if (!ok) throw new Error("❌ BLS signature invalid!");
    console.log("✅ BLS signature valid.");

    console.log("🎉 AP verification PASSED.");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
