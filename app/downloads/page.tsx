"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  FileText,
  FolderOpen,
  Calendar,
} from "lucide-react";
import { downloads } from "@/data/downloads";

export default function DownloadsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = [
    "All",
    "Fee Structure",
    "Forms",
    "Admission",
  ];

  const filteredDownloads = useMemo(() => {
    return downloads.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === "All" || item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  return (
    <main className="bg-brand-cream min-h-screen">

      {/* HERO */}
      <section className="bg-gradient-to-r from-brand-green to-green-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">

          <div className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-sm">
            <FolderOpen className="mr-2 h-4 w-4" />
            Downloads
          </div>

          <h1 className="mt-6 text-5xl font-bold">
            Fee Structures & Admission Forms
          </h1>

          <p className="mt-6 max-w-3xl text-lg text-green-100">
            All documents are provided as PDF.
            Click any file below to download instantly.
          </p>

        </div>
      </section>

      {/* SEARCH */}
      <section className="max-w-7xl mx-auto px-6 py-10">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="relative w-full lg:w-96">

            <Search
              className="absolute left-4 top-4 text-gray-400"
              size={20}
            />

            <input
              type="text"
              placeholder="Search downloads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 focus:border-brand-gold focus:outline-none"
            />

          </div>

          <div className="flex flex-wrap gap-3">

            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-5 py-2 text-sm transition

                ${
                  category === cat
                    ? "bg-brand-gold text-white"
                    : "bg-white hover:bg-brand-green hover:text-white"
                }
                `}
              >
                {cat}
              </button>
            ))}

          </div>

        </div>

      </section>

      {/* DOWNLOAD CARDS */}

      <section className="max-w-7xl mx-auto px-6 pb-20">

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {filteredDownloads.map((item) => (

            <div
              key={item.id}
              className="rounded-3xl bg-white p-7 shadow-soft transition hover:-translate-y-2 hover:shadow-2xl"
            >

              <div className="flex items-center justify-between">

                <div className="rounded-xl bg-red-100 p-4">

                  <FileText
                    className="text-red-600"
                    size={30}
                  />

                </div>

                <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green">
                  {item.category}
                </span>

              </div>

              <h3 className="mt-6 text-2xl font-bold text-brand-dark">
                {item.title}
              </h3>

              <p className="mt-3 text-gray-600">
                {item.description}
              </p>

              <div className="mt-6 flex items-center justify-between text-sm text-gray-500">

                <div className="flex items-center gap-2">

                  <Calendar size={16} />

                  {item.updated}

                </div>

                <span>{item.size}</span>

              </div>

              <Link
                href={item.file}
                target="_blank"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-3 font-semibold text-white transition hover:bg-brand-gold"
              >

                <Download size={18} />

                Download PDF

              </Link>

            </div>

          ))}

        </div>

        {filteredDownloads.length === 0 && (

          <div className="py-20 text-center">

            <FileText
              className="mx-auto mb-4 text-gray-300"
              size={60}
            />

            <h2 className="text-2xl font-bold">
              No documents found
            </h2>

            <p className="mt-3 text-gray-500">
              Try searching with another keyword.
            </p>

          </div>

        )}

      </section>

      {/* HELP SECTION */}

      <section className="bg-white border-t">

        <div className="max-w-7xl mx-auto px-6 py-16">

          <div className="rounded-3xl bg-gradient-to-r from-brand-green to-green-900 p-10 text-white">

            <h2 className="text-3xl font-bold">
              Need Assistance?
            </h2>

            <p className="mt-4 max-w-2xl text-green-100">
              If you're unable to find the document you're looking for,
              please contact our admissions office for assistance.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">

              <a
                href="tel:+254142068933"
                className="rounded-xl bg-brand-gold px-6 py-3 font-semibold text-white transition hover:opacity-90"
              >
                Call Admissions
              </a>

              <Link
                href="/contact"
                className="rounded-xl border border-white px-6 py-3 font-semibold text-white hover:bg-white hover:text-brand-green"
              >
                Contact Us
              </Link>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}