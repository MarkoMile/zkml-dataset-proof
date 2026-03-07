import Link from "next/link";
import { ArrowUpRight, ShieldHalf } from "lucide-react";

export default function Header() {
  return (
    <header className="pt-4 sticky top-0 left-0 z-20">
      <div className="w-3/4 backdrop-blur-xs bg-background/50 mx-auto shadow-primary -sm rounded-full border border-gray-500 h-12 flex justify-between px-2">
        <div className="h-full flex items-center gap-1 text-xl font-bold ml-1">
          <ShieldHalf />
          Shielder
        </div>
        <div className="h-full flex items-center">
          <Link href="/user" className="primary-button gap-1">
            Open app
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
