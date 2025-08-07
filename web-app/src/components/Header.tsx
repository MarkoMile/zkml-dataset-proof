import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Header() {
  return (
    <header className="pt-4 sticky top-0 left-0">
      <div className="w-3/4 backdrop-blur-sm bg-background/50 mx-auto rounded-full border border-gray-500 h-12 flex justify-between px-2">
        <div className="h-full flex items-center text-xl font-bold ml-1">
          WhaleML
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
