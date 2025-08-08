import { build_ap } from "@/scripts/build_ap";
import { setupOutput } from "@/scripts/setup";
import { trainOutput } from "@/scripts/train";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { exec } from "child_process";
const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const buildApObject = await build_ap();

    const trainObject = await trainOutput();

    const { toml, witnesses } = await setupOutput(buildApObject, trainObject);

    fs.writeFile("circuits2/Prover.toml", toml, () => null);

    const { stdout, stderr } = await execAsync("sudo ./scripts/prove2.sh");

    const isValid = stderr.trim().includes("Proof verified successfully");

    return NextResponse.json({ isValid: isValid, witnesses });
  } catch (error) {
    console.error("Verification error:", error);

    return NextResponse.json({ isValid: false });
  }
}
