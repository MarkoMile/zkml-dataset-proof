"use client";
import { toast } from "react-toastify";
import { useState } from "react";

export default function VerifyForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<undefined | boolean>(undefined);

  async function handleClick() {
    setLoading(true);
    try {
      const formData = new FormData();
      const res = await fetch(`/api/verify`, {
        method: "POST",
        body: formData,
      });
      const resBody = await res.json();
      if (res.ok) {
        setResult(resBody.isValid);
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
