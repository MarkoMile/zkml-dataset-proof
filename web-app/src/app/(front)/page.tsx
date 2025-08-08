"use client";
import Header from "@/components/Header";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <div className="blur absolute top-0 left-0 w-full h-full z-0">
        <div className="blob h-full bg-primary"></div>
      </div>
      <Header />
      <div className="z-10 relative">
        <div className="w-3/4 mx-auto h-full flex min-h-[500px] items-center">
          <div className="flex-1">
            <motion.div
              initial={{ x: -200, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
              className="flex-1"
            >
              <h1 className="text-4xl font-bold mb-4">
                Guarantee Dataset Integrity <br /> Detect Compromise &
                Corruption
              </h1>
              <div>
                The only (efficient) library for verifiable AI datasets.
              </div>
            </motion.div>
          </div>
          <div className="flex justify-center flex-1">
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              <img src="/blocks1.png" className="w-[300px]" alt="" />
            </motion.div>
          </div>
        </div>
        <div className="w-3/4 mx-auto h-full flex min-h-[300px] items-center">
          <div className="flex justify-center flex-1">
            <motion.div
              initial={{ x: -200, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              <img src="/blocks2.png" className="w-[300px]" alt="" />
            </motion.div>
          </div>
          <div className="flex-1">
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-2xl font-bold mb-4">Prevent AI bias</h2>
              <h2 className="text-2xl font-bold mb-4">
                Overcome dataset regulations
              </h2>
              <h2 className="text-2xl font-bold mb-4">
                Evade copyright infringements
              </h2>
            </motion.div>
          </div>
        </div>
        <div className="w-3/4 mx-auto h-full flex min-h-[300px] items-center">
          <div className="flex-1">
            <motion.div
              initial={{ x: -200, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-2xl font-bold mb-4">Proof of ownership</h2>
              <div>
                Commit the dataset without revealing it and prov training
              </div>
            </motion.div>
          </div>
          <div className="flex justify-center flex-1">
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              <img src="/zoom.png" className="w-[400px]" alt="" />
            </motion.div>
          </div>
        </div>
        <div className="w-3/4 mx-auto h-full flex min-h-[300px] items-center">
          <div className="flex justify-center flex-1">
            <motion.div
              initial={{ x: -200, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              <img src="/shape.png" className="w-[400px]" alt="" />
            </motion.div>
          </div>
          <div className="flex-1">
            <motion.div
              initial={{ x: 200, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
            >
              <h2 className="text-2xl font-bold mb-4">Distributed training</h2>
              <div>
                Safely distribute the task of training across multiple untrusted
                workers
              </div>
            </motion.div>
          </div>
        </div>
        <div className="w-3/4 mx-auto h-full flex items-center justify-center">
          <div className="h-full mb-16 border border-gray-500 rounded-xl p-6 shadow-primary shadow-sm w-full max-w-xl">
            <motion.div
              initial={{ x: -200, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7 }}
              className="flex items-center justify-center flex-col gap-4"
            >
              <h2 className="text-2xl font-bold">Get started</h2>
              <div>Try our web app</div>
              <Link href="/user" className="primary-button gap-1">
                Open app
                <ArrowUpRight size={18} />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
