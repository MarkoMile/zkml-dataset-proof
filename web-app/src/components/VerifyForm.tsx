"use client";
import { toast } from "react-toastify";
import { useState } from "react";
import { s } from "motion/react-client";
import Link from "next/link";

export default function VerifyForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<undefined | boolean>(undefined);
  const [metadataUrl, setMetadataUrl] = useState("");
  const [commitmentUrl, setCommitmentUrl] = useState("");

  async function handleClick() {
    setLoading(true);

    setResult(undefined);

    try {
      const formData = new FormData();

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

        const commitment = new Blob([resBody.commitment], {
          type: "text/plain",
        });

        setCommitmentUrl(URL.createObjectURL(commitment));
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
      {metadataUrl && commitmentUrl ? (
        <div className="flex gap-3 mb-4">
          <Link
            className="text-primary flex"
            target="_blank"
            href={metadataUrl}
          >
            Metadata
          </Link>

          <Link
            className="text-primary flex"
            target="_blank"
            href={commitmentUrl}
          >
            Commitment
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
