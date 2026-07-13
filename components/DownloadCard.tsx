import {
  Download,
  FileText,
  Calendar,
} from "lucide-react";

import { DownloadItem } from "@/data/downloads";

interface Props {
  item: DownloadItem;
}

export default function DownloadCard({
  item,
}: Props) {
  return (
    <div className="group rounded-3xl bg-white p-7 shadow-soft transition duration-300 hover:-translate-y-2 hover:shadow-2xl">

      <div className="flex items-center justify-between">

        <div className="rounded-2xl bg-red-100 p-4">

          <FileText
            size={34}
            className="text-red-600"
          />

        </div>

        <span className="rounded-full bg-brand-green/10 px-4 py-1 text-xs font-semibold text-brand-green">

          {item.category}

        </span>

      </div>

      <h3 className="mt-6 text-2xl font-bold text-brand-dark">

        {item.title}

      </h3>

      <p className="mt-4 text-slate-600 leading-7">

        {item.description}

      </p>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">

        <div className="flex items-center gap-2">

          <Calendar size={15} />

          {item.updated}

        </div>

        <span>{item.size}</span>

      </div>

      <a
        href={item.file}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-brand-green py-3 font-semibold text-white transition hover:bg-brand-gold"
      >

        <Download size={18} />

        Download PDF

      </a>

    </div>
  );
}