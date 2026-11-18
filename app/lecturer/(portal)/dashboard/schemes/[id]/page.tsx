
'use client';

import Link from 'next/link';
import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  ArrowLeft,
  Download,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// TYPES
// ============================================

type SchemeEntry = {
  id: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  topic: string;
  subtopic: string;
  learningOutcomes: string;
  activities: string;
  resources: string;
  assessment: string;
  remarks: string;
};

type Scheme = {
  id: number;
  programId: number;
  unitId: number;
  academicYear: string;
  term: string;
  title: string;
  status: string;
  programName: string;
  unitCode: string | null;
  unitName: string;
  entries: SchemeEntry[];
};

// ============================================
// CREATE EMPTY WEEK
// ============================================

function createEntry(
  weekNumber: number,
): SchemeEntry {
  return {
    id: 0,
    weekNumber,
    startDate: '',
    endDate: '',
    topic: '',
    subtopic: '',
    learningOutcomes: '',
    activities: '',
    resources: '',
    assessment: '',
    remarks: '',
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SchemeDetailPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const [scheme, setScheme] =
    useState<Scheme | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [downloading, setDownloading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [entries, setEntries] =
    useState<SchemeEntry[]>([]);

  // ==========================================
  // LOAD SCHEME
  // ==========================================

  async function loadScheme() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `/api/lecturer/schemes/${params.id}`,
        {
          credentials: 'include',
          cache: 'no-store',
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to load scheme.',
        );
      }

      setScheme(result.scheme);

      setEntries(
        Array.isArray(result.scheme.entries)
          ? result.scheme.entries
          : [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load scheme.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadScheme();
  }, [params.id]);

  // ==========================================
  // UPDATE WEEKLY ENTRY
  // ==========================================

  function updateEntry(
    index: number,
    field: keyof SchemeEntry,
    value: string,
  ) {
    setEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              [field]:
                field === 'weekNumber'
                  ? Number(value)
                  : value,
            }
          : entry,
      ),
    );
  }

  // ==========================================
  // ADD WEEK
  // ==========================================

  function addWeek() {
    setEntries((current) => [
      ...current,
      createEntry(current.length + 1),
    ]);
  }

  // ==========================================
  // REMOVE WEEK
  // ==========================================

  function removeWeek(index: number) {
    setEntries((current) =>
      current
        .filter(
          (_, entryIndex) => entryIndex !== index,
        )
        .map((entry, entryIndex) => ({
          ...entry,
          weekNumber: entryIndex + 1,
        })),
    );
  }

  // ==========================================
  // SAVE SCHEME
  // ==========================================

  async function handleSave(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!scheme) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!scheme.title.trim()) {
        throw new Error(
          'Scheme title is required.',
        );
      }

      const validEntries = entries.filter(
        (entry) => entry.topic.trim(),
      );

      if (validEntries.length === 0) {
        throw new Error(
          'At least one week with a topic is required.',
        );
      }

      const response = await fetch(
        `/api/lecturer/schemes/${scheme.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: scheme.title.trim(),
            academicYear: scheme.academicYear.trim(),
            term: scheme.term.trim(),
            status: scheme.status,
            entries: validEntries,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to update scheme.',
        );
      }

      setMessage(
        result.message || 'Scheme updated successfully.',
      );

      await loadScheme();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update scheme.',
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // DOWNLOAD SCHEME AS PDF
  // ==========================================

  async function handleDownloadPdf() {
    if (!scheme) return;

    setDownloading(true);
    setError('');
    setMessage('');

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth =
        doc.internal.pageSize.getWidth();

      const pageHeight =
        doc.internal.pageSize.getHeight();

      const margin = 15;

      const green: [number, number, number] = [
        15, 79, 63,
      ];

      const gold: [number, number, number] = [
        215, 169, 59,
      ];

      // ----------------------------------------
      // LOAD COLLEGE LOGO
      // ----------------------------------------

      const logoResponse = await fetch('/images/logo.png');

      if (!logoResponse.ok) {
        throw new Error(
          'Unable to load the SMTC logo from /images/logo.png.',
        );
      }

      const logoBlob = await logoResponse.blob();

      const logoData = await new Promise<string>(
        (resolve, reject) => {
          const reader = new FileReader();

          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Unable to process the SMTC logo.'));
            }
          };

          reader.onerror = () => {
            reject(new Error('Unable to read the SMTC logo.'));
          };

          reader.readAsDataURL(logoBlob);
        },
      );

      // ----------------------------------------
      // COLLEGE HEADER
      // ----------------------------------------

      doc.setFillColor(...green);

      doc.rect(
        0,
        0,
        pageWidth,
        38,
        'F',
      );

      // Logo on the left side of the header.
      // The original logo is square, so its proportions are preserved.
      doc.addImage(
        logoData,
        'PNG',
        12,
        4,
        29,
        29,
      );

      // College name and motto beside the logo.
      doc.setTextColor(255, 255, 255);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);

      doc.text(
        'SHIFAH MEDICAL TRAINING COLLEGE',
        48,
        15,
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);

      doc.text(
        'Health through Innovation and Research',
        48,
        22,
      );

      doc.setTextColor(...gold);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);

      doc.text(
        'SCHEME OF WORK',
        48,
        30,
      );

      // ----------------------------------------
      // SCHEME TITLE
      // ----------------------------------------

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);

      const titleLines = doc.splitTextToSize(
        scheme.title,
        pageWidth - margin * 2,
      );

      let currentY = 46;

      doc.text(
        titleLines,
        margin,
        currentY,
      );

      currentY += titleLines.length * 7 + 5;

      // ----------------------------------------
      // SCHEME INFORMATION
      // ----------------------------------------

      autoTable(doc, {
        startY: currentY,

        head: [
          ['SCHEME INFORMATION', 'DETAILS'],
        ],

        body: [
          ['Programme', scheme.programName],
          [
            'Unit',
            `${scheme.unitCode ? `${scheme.unitCode} - ` : ''}${scheme.unitName}`,
          ],
          ['Academic Year', scheme.academicYear],
          ['Term / Semester', scheme.term],
          ['Status', scheme.status.toUpperCase()],
        ],

        theme: 'grid',

        margin: {
          left: margin,
          right: margin,
          bottom: 20,
        },

        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
          textColor: [51, 65, 85],
        },

        headStyles: {
          fillColor: green,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },

        columnStyles: {
          0: {
            cellWidth: 48,
            fontStyle: 'bold',
          },
          1: {
            cellWidth: 'auto',
          },
        },
      });

      currentY =
        ((doc as any).lastAutoTable?.finalY || currentY) + 12;

      // ----------------------------------------
      // WEEKLY TEACHING PLAN HEADING
      // ----------------------------------------

      if (currentY > pageHeight - 35) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...green);

      doc.text(
        'WEEKLY TEACHING PLAN',
        margin,
        currentY,
      );

      currentY += 8;

      // ----------------------------------------
      // WEEKLY ENTRIES
      // ----------------------------------------

      const sortedEntries = [...entries].sort(
        (a, b) => a.weekNumber - b.weekNumber,
      );

      if (sortedEntries.length === 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);

        doc.text(
          'No weekly teaching entries have been added.',
          margin,
          currentY,
        );
      }

      sortedEntries.forEach((entry) => {
        if (currentY > pageHeight - 45) {
          doc.addPage();
          currentY = 20;
        }

        const dateRange =
          [
            entry.startDate,
            entry.endDate,
          ]
            .filter(Boolean)
            .join(' to ') || 'Not specified';

        const weekDetails = [
          ['Week Number', String(entry.weekNumber)],
          ['Dates', dateRange],
          ['Topic', entry.topic || '-'],
          ['Sub-topic', entry.subtopic || '-'],
          [
            'Learning Outcomes',
            entry.learningOutcomes || '-',
          ],
          [
            'Teaching & Learning Activities',
            entry.activities || '-',
          ],
          [
            'Learning Resources',
            entry.resources || '-',
          ],
          [
            'Assessment Methods',
            entry.assessment || '-',
          ],
          ['Remarks', entry.remarks || '-'],
        ];

        autoTable(doc, {
          startY: currentY,

          head: [
            [
              `WEEK ${entry.weekNumber}`,
              'TEACHING PLAN DETAILS',
            ],
          ],

          body: weekDetails,

          theme: 'grid',

          margin: {
            left: margin,
            right: margin,
            bottom: 20,
          },

          styles: {
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: 3,
            overflow: 'linebreak',
            valign: 'top',
            textColor: [51, 65, 85],
            lineColor: [220, 226, 230],
            lineWidth: 0.2,
          },

          headStyles: {
            fillColor: green,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },

          columnStyles: {
            0: {
              cellWidth: 48,
              fontStyle: 'bold',
              fillColor: [248, 246, 239],
            },
            1: {
              cellWidth: 'auto',
            },
          },

          // Keep the week table together where possible.
          // Large tables can continue onto another page.
          rowPageBreak: 'avoid',
        });

        currentY =
          ((doc as any).lastAutoTable?.finalY || currentY) + 8;
      });

      // ----------------------------------------
      // FOOTER AND PAGE NUMBERS
      // ----------------------------------------

      const totalPages = doc.getNumberOfPages();

      for (
        let page = 1;
        page <= totalPages;
        page++
      ) {
        doc.setPage(page);

        doc.setDrawColor(...gold);

        doc.setLineWidth(0.5);

        doc.line(
          margin,
          pageHeight - 15,
          pageWidth - margin,
          pageHeight - 15,
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);

        doc.text(
          'Shifah Medical Training College | Scheme of Work',
          margin,
          pageHeight - 9,
        );

        doc.text(
          `Page ${page} of ${totalPages}`,
          pageWidth - margin,
          pageHeight - 9,
          {
            align: 'right',
          },
        );
      }

      // ----------------------------------------
      // DOWNLOAD FILE
      // ----------------------------------------

      const safeName = scheme.title
        .trim()
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_');

      const safeYear = scheme.academicYear
        .replace(/[^a-z0-9]/gi, '_');

      const safeTerm = scheme.term
        .replace(/[^a-z0-9]/gi, '_');

      const filename =
        `${safeName}_${safeYear}_${safeTerm}.pdf`;

      doc.save(filename);

      setMessage(
        'Scheme of Work PDF downloaded successfully.',
      );
    } catch (downloadError) {
      console.error(
        'PDF download error:',
        downloadError,
      );

      setError(
        'Unable to generate the PDF. Please try again.',
      );
    } finally {
      setDownloading(false);
    }
  }

  // ==========================================
  // LOADING SCREEN
  // ==========================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex max-w-4xl items-center justify-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Loader2
              size={20}
              className="animate-spin"
            />
            Loading scheme...
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // ERROR SCREEN
  // ==========================================

  if (!scheme) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error || 'Scheme not found.'}
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // MAIN PAGE
  // ==========================================

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* TOP NAVIGATION AND DOWNLOAD */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

          <Link
            href="/lecturer/dashboard/schemes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Schemes
          </Link>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Generating PDF...
              </>
            ) : (
              <>
                <Download size={18} />
                Download PDF
              </>
            )}
          </button>

        </div>

        {/* SUCCESS MESSAGE */}

        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
            {message}
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* SCHEME EDITOR */}

        <form
          onSubmit={handleSave}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >

          {/* SCHEME HEADER */}

          <div className="mb-8">

            <p className="text-xs font-bold uppercase tracking-widest text-brand-gold">
              Scheme of Work
            </p>

            <input
              value={scheme.title}
              onChange={(event) =>
                setScheme((current) =>
                  current
                    ? {
                        ...current,
                        title: event.target.value,
                      }
                    : current,
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-2xl font-extrabold text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />

            {/* SCHEME INFORMATION */}

            <div className="mt-4 grid gap-4 md:grid-cols-4">

              <Info
                label="Programme"
                value={scheme.programName}
              />

              <Info
                label="Unit"
                value={`${scheme.unitCode ? `${scheme.unitCode} — ` : ''}${scheme.unitName}`}
              />

              <Info
                label="Academic Year"
                value={scheme.academicYear}
              />

              <Info
                label="Term"
                value={scheme.term}
              />

            </div>

            {/* STATUS */}

            <div className="mt-5 max-w-xs">

              <label className="block">

                <span className="mb-2 block text-sm font-bold text-slate-700">
                  Status
                </span>

                <select
                  value={scheme.status}
                  onChange={(event) =>
                    setScheme((current) =>
                      current
                        ? {
                            ...current,
                            status: event.target.value,
                          }
                        : current,
                    )
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                >
                  <option value="draft">
                    Draft
                  </option>

                  <option value="published">
                    Published
                  </option>
                </select>

              </label>

            </div>

          </div>

          {/* WEEKLY TEACHING ENTRIES */}

          <div className="space-y-6">

            {entries.map((entry, index) => (

              <section
                key={
                  entry.id ||
                  `new-${index}`
                }
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
              >

                {/* WEEK HEADER */}

                <div className="mb-5 flex items-center justify-between gap-4">

                  <div>

                    <p className="text-xs font-bold uppercase tracking-wider text-brand-gold">
                      Teaching Week
                    </p>

                    <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                      Week {entry.weekNumber}
                    </h2>

                  </div>

                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWeek(index)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  )}

                </div>

                {/* WEEK DETAILS */}

                <div className="grid gap-5 md:grid-cols-2">

                  <input
                    type="date"
                    value={entry.startDate}
                    onChange={(event) =>
                      updateEntry(
                        index,
                        'startDate',
                        event.target.value,
                      )
                    }
                    aria-label="Week start date"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  />

                  <input
                    type="date"
                    value={entry.endDate}
                    onChange={(event) =>
                      updateEntry(
                        index,
                        'endDate',
                        event.target.value,
                      )
                    }
                    aria-label="Week end date"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  />

                  <input
                    value={entry.topic}
                    onChange={(event) =>
                      updateEntry(
                        index,
                        'topic',
                        event.target.value,
                      )
                    }
                    placeholder="Topic"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    required
                  />

                  <input
                    value={entry.subtopic}
                    onChange={(event) =>
                      updateEntry(
                        index,
                        'subtopic',
                        event.target.value,
                      )
                    }
                    placeholder="Sub-topic"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                  />

                  <TextArea
                    label="Learning Outcomes"
                    value={entry.learningOutcomes}
                    onChange={(value) =>
                      updateEntry(
                        index,
                        'learningOutcomes',
                        value,
                      )
                    }
                  />

                  <TextArea
                    label="Activities"
                    value={entry.activities}
                    onChange={(value) =>
                      updateEntry(
                        index,
                        'activities',
                        value,
                      )
                    }
                  />

                  <TextArea
                    label="Resources"
                    value={entry.resources}
                    onChange={(value) =>
                      updateEntry(
                        index,
                        'resources',
                        value,
                      )
                    }
                  />

                  <TextArea
                    label="Assessment"
                    value={entry.assessment}
                    onChange={(value) =>
                      updateEntry(
                        index,
                        'assessment',
                        value,
                      )
                    }
                  />

                  <div className="md:col-span-2">
                    <TextArea
                      label="Remarks"
                      value={entry.remarks}
                      onChange={(value) =>
                        updateEntry(
                          index,
                          'remarks',
                          value,
                        )
                      }
                    />
                  </div>

                </div>

              </section>

            ))}

          </div>

          {/* ADD WEEK BUTTON */}

          <div className="mt-6">

            <button
              type="button"
              onClick={addWeek}
              className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 transition hover:bg-green-100"
            >
              <Plus size={17} />
              Add Week
            </button>

          </div>

          {/* SAVE CHANGES */}

          <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-6 py-3 text-sm font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}

// ============================================
// INFORMATION CARD
// ============================================

type InfoProps = {
  label: string;
  value: string;
};

function Info({
  label,
  value,
}: InfoProps) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">

      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-800">
        {value}
      </p>

    </div>
  );
}

// ============================================
// TEXT AREA COMPONENT
// ============================================

type TextAreaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextArea({
  label,
  value,
  onChange,
}: TextAreaProps) {
  return (
    <label className="block">

      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        rows={4}
        placeholder={label}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
      />

    </label>
  );
}
