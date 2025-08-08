import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import toml from "@iarna/toml";
import { exec } from "child_process";
import zlib from "zlib";
import { promisify } from "util";

const execAsync = promisify(exec);
const gunzipAsync = promisify(zlib.gunzip);

const readFile = promisify(fs.readFile);

export async function POST(request: NextRequest) {
  const requestFormData = await request.formData();

  const housingDataSetFile = requestFormData.get("housingDataSetFile");

  const age = 16;

  const data = {
    x: 1,
    y: 2,
  };

  const tomlString = toml.stringify(data);

  try {
    fs.writeFile("circuits/Prover.toml", tomlString, () => null);

    const { stdout, stderr } = await execAsync("sudo ./scripts/prove.sh");

    const isValid = stderr.trim().includes("Proof verified successfully");

    // Read metadata JSON
    const metadataJson = await readFile("circuits/target/circuits.json");
    const metadata = JSON.parse(metadataJson.toString());

    // Read and decompress commitment from gz file
    const gzBuffer = await readFile("circuits/target/circuits.gz");
    const decompressed = await gunzipAsync(gzBuffer);
    const commitment = decompressed.toString("utf-8").trim();

    return NextResponse.json({ isValid, metadata, commitment });
  } catch (error) {
    console.error("Verification error:", error);

    return NextResponse.json({ isValid: false });
  }
}
