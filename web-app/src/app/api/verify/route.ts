import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import toml from "@iarna/toml";
import { exec } from "child_process";
import zlib from "zlib";
import { promisify } from "util";
import { poseidon } from "@iden3/js-crypto";
import { parse } from "csv-parse/sync";

const execAsync = promisify(exec);
const gunzipAsync = promisify(zlib.gunzip);

const readFile = promisify(fs.readFile);

export async function POST(request: NextRequest) {
  const requestFormData = await request.formData();

  const datasetFile = requestFormData.get("datasetFile");

  const datasetContent = await readFile("data.csv");

  const datasetRows = parse(datasetContent);

  function mapToNumeric(csvData: string[][]): bigint[][] {
    // Skip header row, process data rows
    return csvData.slice(1).map((row) =>
      row.map((value, index) => {
        if (
          index === 5 ||
          index === 6 ||
          index === 7 ||
          index === 8 ||
          index === 9 ||
          index === 11
        ) {
          // Boolean fields: mainroad, guestroom, basement, hotwaterheating, airconditioning, prefarea
          return BigInt(value === "yes" ? 1 : 0);
        } else if (index === 12) {
          // Furnishing status: furnished -> 2, semi-furnished -> 1, unfurnished -> 0
          return BigInt(
            value === "furnished" ? 2 : value === "semi-furnished" ? 1 : 0
          );
        }
        // Numeric fields: parse to integer
        return BigInt(value);
      })
    );
  }

  const mappedRows = mapToNumeric(datasetRows);

  const ROW_COUNT = 5;
  const COLUMN_COUNT = 2;

  const finalRows = mappedRows
    .map((row) => row.slice(0, COLUMN_COUNT))
    .slice(0, ROW_COUNT);

  let datasetHash = poseidon.hash(finalRows[0]);

  for (let i = 1; i < finalRows.length; i++) {
    const rowValue = finalRows[i];

    const hashedRowValue = poseidon.hash(rowValue);
    // SYSTEM WITH ADDING THE HASHED VALUE
    datasetHash = poseidon.hash([datasetHash, hashedRowValue]);

    // SYSTEM WITH ADDING THE VALUES
    // datasetHash = poseidon.hash([datasetHash, ...rowValue]);
  }

  const data = {
    dataset_hash: datasetHash.toString(),
    expected_rows: finalRows,
  };

  const tomlString = toml.stringify(data as any);

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
    const witness = decompressed.toString("utf-8").trim();

    return NextResponse.json({ isValid, metadata, witness });
  } catch (error) {
    console.error("Verification error:", error);

    return NextResponse.json({ isValid: false });
  }
}
