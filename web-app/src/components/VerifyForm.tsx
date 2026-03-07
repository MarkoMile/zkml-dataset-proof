"use client";
import { toast } from "react-toastify";
import { useState } from "react";
import { Check, XCircle } from "lucide-react";

export default function VerifyForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<undefined | boolean>(undefined);
  const [values, setValues] = useState<{ rho: string, dW: string, B: string, sigma: string } | null>(null);

  const [inputValues, setInputValues] = useState({ rho: "", dW: "", B: "", sigma: "" });

  async function handleVerify(useCustomValues: boolean = false) {
    setLoading(true);
    setResult(undefined);

    try {
      const formData = new FormData();

      if (useCustomValues) {
        formData.set("rho", inputValues.rho);
        formData.set("dW", inputValues.dW);
        formData.set("B", inputValues.B);
        formData.set("sigma", inputValues.sigma);
      }

      const res = await fetch(`/api/verify`, {
        method: "POST",
        body: formData,
      });

      const resBody = await res.json();
      if (res.ok) {
        setResult(resBody.isValid);
        setValues(resBody.values);
        if (!useCustomValues) {
          setInputValues(resBody.values);
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

  if (!values) {
    return (
      <div className="border border-gray-700/50 rounded-2xl p-6 shadow-lg w-full max-w-2xl bg-[#111111]/80 backdrop-blur-sm">
        <button
          onClick={() => handleVerify(false)}
          disabled={loading}
          className="primary-button w-full justify-center h-12 text-base font-medium"
        >
          {loading ? "Generating proof..." : "Generate proof and verify"}
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-700/50 rounded-2xl p-8 shadow-lg w-full max-w-2xl bg-[#111111]/80 backdrop-blur-sm text-white">
      <div className="flex justify-center gap-16 mb-8">
        <div className="flex flex-col items-center gap-3">
          <Check className="text-emerald-500" size={32} />
          <span className="text-emerald-500 font-medium tracking-wide">ZK Proof Generated</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          {loading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent text-sky-500 motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          ) : result === undefined ? (
            <div className="h-8" /> 
          ) : result ? (
            <Check className="text-sky-500" size={32} />
          ) : (
            <XCircle className="text-red-500" size={32} />
          )}
          
          <span className={`font-medium tracking-wide ${
            loading ? "text-sky-500" :
            result === undefined ? "text-transparent" :
            result ? "text-sky-500" : "text-red-500"
          }`}>
            {loading ? "Verifying..." : 
             result === undefined ? "Waiting" :
             result ? "Proof verified" : "Proof not verified"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5 mb-8">
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-200 text-sm ml-1">Rho</label>
          <input 
            type="text" 
            value={inputValues.rho} 
            onChange={(e) => setInputValues({...inputValues, rho: e.target.value})}
            className="w-full bg-white text-black px-4 py-2.5 rounded-lg outline-none font-mono text-sm shadow-inner"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-200 text-sm ml-1">Delta W</label>
          <input 
            type="text" 
            value={inputValues.dW} 
            onChange={(e) => setInputValues({...inputValues, dW: e.target.value})}
            className="w-full bg-white text-black px-4 py-2.5 rounded-lg outline-none font-mono text-sm shadow-inner"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-200 text-sm ml-1">B</label>
          <input 
            type="text" 
            value={inputValues.B} 
            onChange={(e) => setInputValues({...inputValues, B: e.target.value})}
            className="w-full bg-white text-black px-4 py-2.5 rounded-lg outline-none font-mono text-sm shadow-inner"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-200 text-sm ml-1">Sigma</label>
          <input 
            type="text" 
            value={inputValues.sigma} 
            onChange={(e) => setInputValues({...inputValues, sigma: e.target.value})}
            className="w-full bg-white text-black px-4 py-2.5 rounded-lg outline-none font-mono text-sm shadow-inner"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => handleVerify(false)}
          disabled={loading}
          className="primary-button flex-1 justify-center h-12 text-base"
        >
          {loading ? "Generating..." : "Generate proof and verify"}
        </button>
        <button
          onClick={() => handleVerify(true)}
          disabled={loading}
          className="primary-button flex-1 justify-center h-12 text-base"
        >
          {loading ? "Verifying..." : "Verify with values"}
        </button>
      </div>
    </div>
  );
}
