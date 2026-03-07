import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import toml from "@iarna/toml";
import { exec } from "child_process";
import zlib from "zlib";
import { promisify } from "util";
import { Poseidon } from "@iden3/js-crypto";

const execAsync = promisify(exec);
const gunzipAsync = promisify(zlib.gunzip);
const readFile = promisify(fs.readFile);

const P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function modP(x: bigint): bigint {
  const r = x % P;
  return r >= 0n ? r : r + P;
}

function toBigIntSafe(x: any): bigint {
  if (typeof x === "bigint") return modP(x);
  if (typeof x === "number") return modP(BigInt(Math.trunc(x)));
  if (typeof x === "string") {
    const s = x.trim();
    const bi = s.startsWith("0x") ? BigInt(s) : BigInt(s);
    return modP(bi);
  }
  throw new Error(`Cannot convert to BigInt: ${x}`);
}

function H(inputs: bigint[]): bigint {
  return modP(Poseidon.hash(inputs));
}

export async function POST(request: NextRequest) {
  try {
    // Read required JSON files. 
    // From within Next.js api route execution, process.cwd() is generally the root of the next.js project ('web-app')
    const apPath = path.resolve(process.cwd(), "../ts-scripts/AP.json");
    const modelPath = path.resolve(process.cwd(), "../trained_model.json");

    if (!fs.existsSync(apPath)) {
      return NextResponse.json({ isValid: false, message: "AP.json not found." }, { status: 400 });
    }
    if (!fs.existsSync(modelPath)) {
      return NextResponse.json({ isValid: false, message: "trained_model.json not found." }, { status: 400 });
    }

    const apContent = await readFile(apPath, "utf8");
    const modelContent = await readFile(modelPath, "utf8");

    const ap = JSON.parse(apContent);
    const modelRaw = JSON.parse(modelContent);

    const rho = toBigIntSafe(ap?.m?.rho);
    const sigma = toBigIntSafe(ap?.sigma);

    const w1 = toBigIntSafe(modelRaw?.weight);
    const w0 = modelRaw?.w0 !== undefined ? toBigIntSafe(modelRaw.w0) : 0n;

    const deltaW = modP(w0 - w1);
    const v = H([sigma, rho]);
    const B = modP(deltaW * v);

    const C_rho = H([rho]);
    const C_deltaW = H([deltaW]);
    const C_B = H([B]);
    const C_sigma = H([sigma]);

    const data = {
      C_rho: C_rho.toString(),
      C_dW: C_deltaW.toString(),
      C_B: C_B.toString(),
      C_sigma: C_sigma.toString(),
      rho: rho.toString(),
      dW: deltaW.toString(),
      B: B.toString(),
      sigma: sigma.toString(),
    };

    const tomlString = toml.stringify(data as any);

    fs.writeFileSync("circuits/Prover.toml", tomlString);

    // Call the original script to execute nargo and bb logic
    const { stdout, stderr } = await execAsync("./scripts/prove.sh");

    const isValid = stderr.trim().includes("Proof verified successfully") || stdout.trim().includes("Proof verified successfully");

    // Read metadata JSON
    const metadataJson = await readFile("circuits/target/circuits.json");
    const metadata = JSON.parse(metadataJson.toString());

    // Read and decompress commitment from gz file
    const gzBuffer = await readFile("circuits/target/circuits.gz");
    const decompressed = await gunzipAsync(gzBuffer);
    const witness = decompressed.toString("utf-8").trim();

    return NextResponse.json({ isValid, metadata, witness });
  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json({ isValid: false, message: error.message }, { status: 500 });
  }
}
