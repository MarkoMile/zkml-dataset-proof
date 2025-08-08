// src/verify.ts
// Verifikacija minimalnog AP.json (ECDSA secp256k1, compact 64B; bez msg_hash)
// - Provera Merkle root-a iz dataset-a (Poseidon/BN254)
// - Provera ECDSA potpisa nad SHA-256(JSON(m)), public key je 33B compressed

import fs from "fs";
import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { Poseidon } from "@iden3/js-crypto";

// BN254 field
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
  if (leaves.length === 0) throw new Error("Dataset je prazan");
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

function hexToBytes(h: string): Uint8Array {
  return new Uint8Array(Buffer.from(h.replace(/^0x/, ""), "hex"));
}

(async () => {
  try {
    const ap = JSON.parse(fs.readFileSync("AP.json", "utf8"));
    const { pk, sigma, dataset, m } = ap;

    if (!pk || !sigma || !dataset || !m?.rho) {
      throw new Error("AP.json ne sadrži očekivana polja: { pk, sigma, dataset, m.rho }");
    }

    // 1) Merkle root iz dataset-a
    const leaves = dataset.rows.map((r: number[]) =>
      poseidonHash(r.map((v) => toField(v)))
    );
    const rhoCalc = "0x" + merkleRoot(leaves).toString(16);
    if (rhoCalc !== m.rho) throw new Error("❌ Merkle root mismatch!");
    console.log("✅ Merkle root matches.");

    // 2) ECDSA verifikacija: hash = SHA-256(JSON(m) sa stabilnim redosledom ključeva)
    const mBytes = Buffer.from(JSON.stringify(m, Object.keys(m).sort()), "utf8");
    const msgHash = sha256(mBytes); // 32B

    const sig = hexToBytes(sigma);  // očekujemo 64B r||s
    const pub = hexToBytes(pk);     // 33B compressed (ili 65B uncompressed – oba su ok)

    const ok = secp.verify(sig, msgHash, pub);
    if (!ok) throw new Error("❌ ECDSA signature invalid!");
    console.log("✅ ECDSA signature valid.");

    console.log("🎉 AP verification PASSED.");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
