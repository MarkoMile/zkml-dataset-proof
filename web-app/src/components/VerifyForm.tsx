"use client";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import Link from "next/link";
import FilesInput from "./FileInput";
import { CheckIcon, XIcon } from "lucide-react";

export default function VerifyForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<undefined | boolean>(undefined);
  const [metadataUrl, setMetadataUrl] = useState("");
  const [witnessUrl, setWitnessUrl] = useState("");

  const [datasetFile, setDatasetFile] = useState<File>();

  async function handleClick() {
    if (!datasetFile) {
      return;
    }
    setLoading(true);

    setResult(undefined);

    setMetadataUrl("");

    setWitnessUrl("");

    try {
      const formData = new FormData();

      formData.set("datasetFile", datasetFile);

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
    setDatasetFile(undefined);
    setLoading(false);
  }

  useEffect(() => {
    if (datasetFile) {
      setResult(undefined);
    }
  }, [datasetFile]);

  return (
    <div className="border flex flex-col items-center border-gray-500 rounded-xl p-6 shadow-primary shadow-sm w-full max-w-xl">
      {result === true ? (
        <div>
          <CheckIcon size={32} className="text-emerald-500 mx-auto mb-2" />
          <div className="text-emerald-500 font-medium mb-4">
            ZK Proof Generated and Verified
          </div>
        </div>
      ) : null}
      {result === false ? (
        <div>
          <XIcon size={32} className="text-red-500 mx-auto mb-2" />
          <div className="text-red-500 font-medium mb-4">
            Failed to generate ZK Proof
          </div>
        </div>
      ) : null}
      {/* {metadataUrl && witnessUrl ? (
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
      ) : null} */}

      <div className="mb-4 items-center flex gap-3">
        <FilesInput className="" file={datasetFile} setFile={setDatasetFile} />
        {datasetFile ? (
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs">File name:</div>
              <div className="text-sm">{datasetFile.name}</div>
            </div>
            <button onClick={() => setDatasetFile(undefined)}>
              <XIcon />
            </button>
          </div>
        ) : null}
      </div>

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
