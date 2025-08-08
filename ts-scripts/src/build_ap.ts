// src/build_ap.ts
// AP.json: { pk, sigma, dataset, m:{rho} }  ← bez msg_hash / bez alg
// - Merkle root (Poseidon/BN254) iz prvih 5 redova area/price
// - ECDSA secp256k1 potpis nad SHA-256(JSON(m)), compact 64B (r||s)

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import * as secp from "@noble/secp256k1";
import { sha256 as sha256hash } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { Poseidon } from "@iden3/js-crypto";

// --- noble wiring (potrebno za neke verzije @noble/secp256k1) ---
try {
  (secp as any).etc.hmacSha256Sync = (key: Uint8Array, ...msgs: Uint8Array[]) =>
    hmac(sha256hash, key, (secp as any).etc.concatBytes(...msgs));
  (secp as any).etc.sha256Sync = (...msgs: Uint8Array[]) =>
    sha256hash((secp as any).etc.concatBytes(...msgs));
} catch {
  (secp as any).utils.hmacSha256Sync = (key: Uint8Array, ...msgs: Uint8Array[]) =>
    hmac(sha256hash, key, (secp as any).utils.concatBytes(...msgs));
  (secp as any).utils.sha256Sync = (...msgs: Uint8Array[]) =>
    sha256hash((secp as any).utils.concatBytes(...msgs));
}

// --- field prime (BN254) ---
const P =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const toHex = (x: bigint) => "0x" + x.toString(16);

// ---------- CSV -> tiny dataset ----------
type TinyRow = { area: number; price: number };

function loadTinyDataset(csvPath: string): TinyRow[] {
  const raw = fs.readFileSync(csvPath, "utf8");
  const table: string[][] = parse(raw, { skip_empty_lines: true });
  if (table.length < 2) throw new Error("CSV must have header + rows");

  const header = table[0].map((h) => h.toLowerCase().trim());
  const idxArea = header.indexOf("area");
  const idxPrice = header.indexOf("price");
  if (idxArea === -1 || idxPrice === -1) {
    throw new Error(
      `CSV mora da sadrži "area" i "price". Nađeno: [${table[0].join(", ")}]`
    );
  }

  return table.slice(1, 6).map((r, i) => {
    const area = Number(r[idxArea]);
    const price = Number(r[idxPrice]);
    if (!Number.isFinite(area)) throw new Error(`Non-numeric area u redu ${i + 2}: ${r[idxArea]}`);
    if (!Number.isFinite(price)) throw new Error(`Non-numeric price u redu ${i + 2}: ${r[idxPrice]}`);
    return { area, price };
  });
}

// ---------- Poseidon / Merkle ----------
function toField(x: number): bigint {
  let bi = BigInt(Math.round(x));
  bi = ((bi % P) + P) % P;
  return bi;
}
function poseidonHash(inputs: bigint[]): bigint {
  const out = Poseidon.hash(inputs as unknown as bigint[]);
  return (typeof out === "bigint" ? out : BigInt(out)) % P;
}
function merkleRootPoseidon(leaves: bigint[]): bigint {
  if (leaves.length === 0) throw new Error("No leaves");
  let level = leaves.slice();
  while (level.length > 1) {
    if (level.length % 2 === 1) level.push(level[level.length - 1]);
    const next: bigint[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(poseidonHash([level[i], level[i + 1]]));
    }
    level = next;
  }
  return level[0];
}

// ---------- Keys ----------
function loadOrGenerateSK(skHex?: string): Uint8Array {
  if (skHex) {
    const buf = Buffer.from(skHex.replace(/^0x/, "").trim(), "hex");
    if (buf.length === 32 && secp.utils.isValidPrivateKey(buf)) {
      return new Uint8Array(buf);
    }
  }
  return secp.utils.randomPrivateKey();
}

// Uvek vrati compact 64B (r||s) potpis, nezavisno od verzije biblioteke
async function signCompact64(msgHash: Uint8Array, sk: Uint8Array): Promise<Uint8Array> {
  const res: any = await (secp as any).sign(msgHash, sk);
  if (res instanceof Uint8Array) return res; // već 64B
  if (res && typeof res === "object") {
    if (typeof res.toCompactRawBytes === "function") return res.toCompactRawBytes();
    if (typeof res.toCompactHex === "function") {
      const hex = res.toCompactHex();
      return new Uint8Array(Buffer.from(hex.replace(/^0x/, ""), "hex"));
    }
    if (Array.isArray(res) && res[0] instanceof Uint8Array) return res[0]; // [sig, recId]
  }
  throw new Error("Unexpected return type from secp.sign()");
}

// ---------- Main ----------
(async () => {
  try {
    const CSV = "dataset.csv";

    // 1) dataset
    const tiny = loadTinyDataset(CSV);

    // 2) rho
    const leaves = tiny.map((r) => poseidonHash([toField(r.area), toField(r.price)]));
    const rho = merkleRootPoseidon(leaves);

    // 3) m (samo rho) + stabilan JSON
    const m = { rho: toHex(rho) };
    const mBytes = Buffer.from(JSON.stringify(m, Object.keys(m).sort()), "utf8");

    // 4) potpis (ECDSA secp256k1, compact 64B)
    const SK_CA_HEX = process.env.SK_CA;    // opciono: SK_CA=0x... node src/build_ap.ts
    const sk = loadOrGenerateSK(SK_CA_HEX);
    const pkCompressed = secp.getPublicKey(sk, true);  // 33B compressed
    const msgHash = sha256hash(mBytes);                // 32B hash
    const sigCompact = await signCompact64(msgHash, sk); // 64B r||s

    // 5) AP.json  (nema msg_hash)
    const ap = {
      pk: "0x" + Buffer.from(pkCompressed).toString("hex"),
      sigma: "0x" + Buffer.from(sigCompact).toString("hex"),
      dataset: {
        columns: ["area", "price"],
        rows: tiny.map((r) => [r.area, r.price]),
      },
      m,
    };

    fs.writeFileSync(path.resolve("AP.json"), JSON.stringify(ap, null, 2));

    // Ispis samo traženih informacija
    console.log("✅ AP.json kreiran.");
    console.log("• rho :", m.rho);
    console.log("• pk  :", ap.pk);
    console.log("• sig :", ap.sigma);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
