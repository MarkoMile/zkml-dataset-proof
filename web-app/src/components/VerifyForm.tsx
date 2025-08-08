"use client";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import Link from "next/link";
import FilesInput from "./FileInput";
import { CheckIcon, XCircle, XIcon } from "lucide-react";
import Input from "./Input";

export default function VerifyForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<undefined | boolean>(undefined);

  const [rho, setRho] = useState("");
  const [deltaW, setDeltaW] = useState("");
  const [b, setB] = useState("");
  const [sigma, setSigma] = useState("");

  const [datasetFile, setDatasetFile] = useState<File>();

  async function handleProof() {
    setLoading(true);

    setVerificationResult(undefined);
    setResult(undefined);

    setRho("");
    setDeltaW("");
    setB("");
    setSigma("");

    try {
      const formData = new FormData();

      const res = await fetch(`/api/zk-new`, {
        method: "POST",
        body: formData,
      });

      const resBody = await res.json();
      if (res.ok) {
        setResult(resBody.isValid);

        setVerificationResult(resBody.isValid);

        const witnesses = resBody.witnesses;

        if (witnesses) {
          setRho(witnesses[0]);
          setDeltaW(witnesses[1]);
          setB(witnesses[2]);
          setSigma(witnesses[3]);
        }
      } else if (resBody.message) {
        toast.error(resBody.message);
      }
    } catch (error: any) {
      toast.error(error.message);

      console.log(error);
    }

    setLoading(false);
  }

  const [verificationResult, setVerificationResult] = useState<
    undefined | boolean
  >(undefined);

  async function handleVerify() {
    setLoading(true);

    setVerificationResult(undefined);

    try {
      const res = await fetch(`/api/zk-verify`, {
        method: "POST",
        body: JSON.stringify({ witnesses: [rho, deltaW, b, sigma] }),
      });

      const resBody = await res.json();
      if (res.ok) {
        setVerificationResult(resBody.isValid);
      } else if (resBody.message) {
        toast.error(resBody.message);
      }
    } catch (error: any) {
      toast.error(error.message);

      console.log(error);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (datasetFile) {
      setResult(undefined);
    }
  }, [datasetFile]);

  return (
    <div className="border flex flex-col items-center border-gray-500 rounded-xl p-6 shadow-primary shadow-sm w-full max-w-xl">
      <div className="flex gap-3">
        {result === true ? (
          <div>
            <CheckIcon size={32} className="text-emerald-500 mx-auto mb-2" />
            <div className="text-emerald-500 font-medium mb-4">
              ZK Proof Generated
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
        {verificationResult === true ? (
          <div>
            <CheckIcon size={32} className="text-sky-500 mx-auto mb-2" />
            <div className="text-sky-500 font-medium mb-4">Proof verified</div>
          </div>
        ) : null}
        {verificationResult === false ? (
          <div>
            <XCircle size={32} className="text-red-500 mx-auto mb-2" />
            <div className="text-red-500 font-medium mb-4">
              Proof not verified
            </div>
          </div>
        ) : null}
      </div>

      {result === true ? (
        <div className="space-y-4 mb-4 w-full">
          <Input
            value={rho}
            setValue={setRho}
            label="Rho"
            className="bg-white w-full text-gray-800 border border-primary px-4 py-1 rounded-lg"
          />
          <Input
            value={deltaW}
            setValue={setDeltaW}
            label="Delta W"
            className="bg-white w-full text-gray-800 border border-primary px-4 py-1 rounded-lg"
          />
          <Input
            value={b}
            setValue={setB}
            label="B"
            className="bg-white w-full text-gray-800 border border-primary px-4 py-1 rounded-lg"
          />
          <Input
            value={sigma}
            setValue={setSigma}
            label="Sigma"
            className="bg-white w-full text-gray-800 border border-primary px-4 py-1 rounded-lg"
          />
        </div>
      ) : null}

      <div className="flex gap-3 w-full flex-1">
        <button
          onClick={handleProof}
          disabled={loading}
          className="primary-button flex-1 justify-center"
        >
          {loading ? "Loading..." : "Generate proof and verify"}
        </button>
        {result === true ? (
          <button
            onClick={handleVerify}
            disabled={loading}
            className="primary-button flex-1 justify-center"
          >
            {loading ? "Loading..." : "Verify with values"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
