import { build_ap } from "@/scripts/build_ap";
import { setupOutput } from "@/scripts/setup";
import { trainOutput } from "@/scripts/train";
import toml from "@iarna/toml";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { exec } from "child_process";
const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const witnesses = body.witnesses;
  try {
    const oldTomlString = fs.readFileSync("circuits2/Prover.toml", "utf8");

    // Parse into object
    const oldToml = toml.parse(oldTomlString);
    const commitments = oldToml.commitments;

    console.log(oldToml);

    const data = {
      commitments: commitments,
      witnesses: witnesses,
    };

    const tomlString = toml.stringify(data as any);

    fs.writeFile("circuits2/Prover.toml", tomlString, () => null);

    const { stdout, stderr } = await execAsync("sudo ./scripts/prove2.sh");

    const isValid = stderr.trim().includes("Proof verified successfully");

    return NextResponse.json({ isValid: isValid });
  } catch (error) {
    console.error("Verification error:", error);

    return NextResponse.json({ isValid: false });
  }
}
