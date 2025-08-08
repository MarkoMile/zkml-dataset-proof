import VerifyForm from "@/components/VerifyForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function page() {
  return (
    <div className="w-3/4 h-full min-h-screen mx-auto flex flex-col gap-4 items-center justify-center">
      <VerifyForm />
      <Link href="/" className="text-primary flex gap-2 items-center">
        Home <ArrowLeft size={16} />
      </Link>
    </div>
  );
}
