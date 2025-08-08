"use client";
import { toast } from "react-toastify";
import { useState } from "react";
import Link from "next/link";

export default function VerifyForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<undefined | boolean>(undefined);
  const [metadataUrl, setMetadataUrl] = useState("");
  const [witnessUrl, setWitnessUrl] = useState("");

  const [datasetFile, setDatasetFile] = useState<File>();

  async function handleClick() {
    setLoading(true);

    setResult(undefined);

    setMetadataUrl("");

    setWitnessUrl("");

    try {
      const formData = new FormData();

      if (datasetFile) {
        formData.set("datasetFile", datasetFile);
      }

      const res = await fetch(`/api/verify`, {
        method: "POST",
        body: formData,
      });

      const resBody = await res.json();
      if (res.ok) {
        setResult(resBody.isValid);

        const metadataJsonString = JSON.stringify(resBody.metadata);

        const metadata = new Blob([metadataJsonString], {
          type: "application/json",
        });

        setMetadataUrl(URL.createObjectURL(metadata));

        const witness = new Blob([resBody.witness], {
          type: "text/plain",
        });

        setWitnessUrl(URL.createObjectURL(witness));
      } else if (resBody.message) {
        toast.error(resBody.message);
      }
    } catch (error: any) {
      toast.error(error.message);

      console.log(error);
    }

    setLoading(false);
  }

  return (
    <div className="border border-gray-500 rounded-xl p-6 shadow-primary shadow-sm w-full max-w-xl">
      {result === true ? (
        <div className="text-emerald-500 font-medium mb-4">Verified</div>
      ) : null}
      {result === false ? (
        <div className="text-red-500 font-medium mb-4">Not verified</div>
      ) : null}
      {metadataUrl && witnessUrl ? (
        <div className="flex gap-3 mb-4">
          <Link
            className="text-primary flex"
            target="_blank"
            href={metadataUrl}
          >
            Metadata
          </Link>

          <Link className="text-primary flex" target="_blank" href={witnessUrl}>
            Witness
          </Link>
        </div>
      ) : null}

      <button
        onClick={handleClick}
        disabled={loading}
        className="primary-button w-full justify-center"
      >
        {loading ? "Loading..." : "Verify"}
      </button>
    </div>
  );
}
