// src/build_ap.ts
// Minimalni AP.json: { pk_ca, sigma, dataset, m:{rho} }
// - CSV -> prvih 5 redova (area, price)
// - Merkle root sa Poseidon hashom
// - BLS potpis nad m (rho)
// - SCALE izbačen (radimo bez skaliranja)

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import * as bls from "@noble/bls12-381";
import { Poseidon } from "@iden3/js-crypto";

const P =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const toHex = (x: bigint) => "0x" + x.toString(16);

/* ---------- CSV loader ---------- */
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
      `CSV mora da sadrži kolone "area" i "price". Nađeno: [${table[0].join(", ")}]`
    );
  }

  return table.slice(1, 6).map((r, i) => {
    const area = Number(r[idxArea]);
    const price = Number(r[idxPrice]);
    if (!Number.isFinite(area) || !Number.isFinite(price)) {
      throw new Error(
        `Non-numeric vrednost u redu ${i + 2}: area=${r[idxArea]}, price=${r[idxPrice]}`
      );
    }
    return { area, price };
  });
}

/* ---------- Poseidon helpers ---------- */
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

/* ---------- CA key loader ---------- */
function loadOrGenerateCA(skHex?: string) {
  let sk_bytes: Uint8Array;
  if (skHex) {
    const buf = Buffer.from(skHex.replace(/^0x/, "").trim(), "hex");
    if (buf.length === 32) {
      sk_bytes = new Uint8Array(buf);
      console.log("✅ Učitani postojeći CA privatni ključ.");
    } else {
      console.warn("⚠️ Nevalidan privatni ključ. Generišem novi.");
      sk_bytes = bls.utils.randomPrivateKey();
    }
  } else {
    console.warn("⚠️ Nema privatnog ključa. Generišem novi.");
    sk_bytes = bls.utils.randomPrivateKey();
  }
  return sk_bytes;
}

/* ---------- Main ---------- */
(async () => {
  try {
    const CSV = "dataset.csv";

    // 1) Dataset
    const tiny = loadTinyDataset(CSV);

    // 2) Rho
    const leaves = tiny.map((r) =>
      poseidonHash([toField(r.area), toField(r.price)])
    );
    const rho = merkleRootPoseidon(leaves);

    // 3) m objekt (samo rho)
    const m = { rho: toHex(rho) };

    // 4) Ključevi
    const SK_CA_HEX = process.env.SK_CA;
    const sk_bytes = loadOrGenerateCA(SK_CA_HEX);
    const pk_bytes = await bls.getPublicKey(sk_bytes);

    // 5) Potpis
    const mBytes = Buffer.from(JSON.stringify(m, Object.keys(m).sort()), "utf8");
    const sigma_bytes = await bls.sign(mBytes, sk_bytes);

    // 6) AP.json
    const ap = {
      pk_ca: "0x" + Buffer.from(pk_bytes).toString("hex"),
      sigma: "0x" + Buffer.from(sigma_bytes).toString("hex"),
      dataset: {
        columns: ["area", "price"],
        rows: tiny.map((r) => [r.area, r.price])
      },
      m
    };

    fs.writeFileSync(path.resolve("AP.json"), JSON.stringify(ap, null, 2));
    console.log("✅ AP.json kreiran.");
    console.log("• rho:", m.rho);
    console.log("• pk_ca:", ap.pk_ca);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
