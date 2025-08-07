import Header from "@/components/Header";

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <div className="blur absolute top-0 left-0 w-full h-full">
        <div className="blob h-full bg-primary"></div>
      </div>
      <Header />
      <div className="w-3/4 mx-auto h-full flex min-h-[500px] items-center">
        <div>
          <h1 className="text-4xl font-bold mb-4">
            Guarantee AI Integrity <br /> Detect Compromise & Corruption
          </h1>
          <div>
            The only audited library for verifiable AI. <br /> Deployed in
            production adversarial environments where integrity matters most.
          </div>
        </div>
      </div>
    </div>
  );
}
