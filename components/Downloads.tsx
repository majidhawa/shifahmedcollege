"use client";

import { useMemo, useState } from "react";

import { downloads } from "@/data/downloads";

import DownloadCard from "./DownloadCard";
import { PageHero } from "./PageHero";
import SearchBar from "./SearchBar";

export default function Downloads() {
  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("All");

  const categories = [
    "All",
    "Fee Structure",
    "Forms",
    "Admission",
  ];

  const filtered = useMemo(() => {
    return downloads.filter((item) => {
      const matchSearch =
        item.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.description
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchCategory =
        category === "All" ||
        item.category === category;

      return matchSearch && matchCategory;
    });
  }, [search, category]);

  return (
    <>

      <PageHero
        eyebrow="Downloads"
        title="Fee Structures & Admission Forms"
        text="All documents are provided as PDF. Click any file to download."
      />

      <section className="container-shell py-16">

        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">

          <SearchBar
            value={search}
            onChange={setSearch}
          />

          <div className="flex flex-wrap gap-2">

            {categories.map((cat) => (

              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-5 py-3 text-sm font-medium transition

                ${
                  category === cat
                    ? "bg-brand-green text-white"
                    : "bg-white border border-slate-200 hover:border-brand-green hover:text-brand-green"
                }`}
              >

                {cat}

              </button>

            ))}

          </div>

        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">

          {filtered.map((item) => (

            <DownloadCard
              key={item.id}
              item={item}
            />

          ))}

        </div>

        {filtered.length === 0 && (

          <div className="rounded-3xl bg-white py-20 text-center shadow-soft">

            <h3 className="text-2xl font-bold text-brand-dark">

              No matching documents found

            </h3>

            <p className="mt-3 text-slate-500">

              Try another keyword.

            </p>

          </div>

        )}

      </section>

    </>
  );
}