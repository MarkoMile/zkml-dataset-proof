import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import toml from "@iarna/toml";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
    console.log("RAW stderr:", JSON.stringify(stderr));

    const isValid = stderr.trim().includes("Proof verified successfully");
    return NextResponse.json({ isValid });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { message: "An error occurred while verifying" },
      { status: 400 }
    );
  }
}
