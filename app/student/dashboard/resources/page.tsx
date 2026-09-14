import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers3,
  Video,
} from 'lucide-react';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

interface DocumentResource {
  id: number;
  title: string;
  description: string | null;
  fileName: string | null;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;

  unitName: string;
  topicTitle: string;
  lessonTitle: string;
}

interface VideoResource {
  id: number;
  title: string;
  description: string | null;

  videoUrl: string | null;
  videoFileName: string | null;
  videoFileUrl: string | null;

  thumbnailUrl: string | null;
  durationSeconds: number | null;
  sourceType: string | null;

  unitName: string;
  topicTitle: string;
  lessonTitle: string;
}

/* =========================================================
   PAGE
========================================================= */

export default async function StudentResourcesPage() {
  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  const session = await getStudentSession();

  if (!session) {
    redirect('/student/login');
  }

  const applicationId = Number(session.applicationId);

  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    redirect('/student/login');
  }

  /* =======================================================
     STUDENT INFORMATION
  ======================================================= */

  let studentName = 'Student';

  let applicationNumber =
    session.applicationNumber || null;

  let admissionNumber: string | null = null;

  try {
    const studentResult = await pool.query(
      `
        SELECT
          a.id AS application_id,
          a.application_number,

          CONCAT_WS(
            ' ',
            a.first_name,
            a.middle_name,
            a.surname
          ) AS student_name,

          COALESCE(
            ad.admission_number,
            a.admission_number
          ) AS admission_number

        FROM applications a

        LEFT JOIN admissions ad
          ON ad.application_id = a.id

        WHERE a.id = $1

        LIMIT 1
      `,
      [applicationId]
    );

    if (studentResult.rows.length > 0) {
      const row = studentResult.rows[0];

      studentName =
        row.student_name?.trim() || 'Student';

      applicationNumber =
        row.application_number ||
        applicationNumber ||
        null;

      admissionNumber =
        row.admission_number || null;
    }
  } catch (error) {
    console.error(
      'STUDENT RESOURCES - STUDENT INFORMATION ERROR:',
      error
    );
  }

  /* =======================================================
     GET STUDENT ENROLLMENT
  ======================================================= */

  const enrollmentResult = await pool.query(
    `
      SELECT
        e.id AS enrollment_id,
        e.program_id,

        p.name AS program_name,
        p.code AS program_code,
        p.description AS program_description

      FROM lms_enrollments e

      INNER JOIN lms_programs p
        ON p.id = e.program_id

      WHERE e.application_id = $1

        AND (
          e.enrollment_status IS NULL
          OR LOWER(
            e.enrollment_status::text
          ) NOT IN (
            'cancelled',
            'dropped'
          )
        )

        AND (
          p.status IS NULL
          OR LOWER(
            p.status::text
          ) NOT IN (
            'inactive',
            'deleted',
            'archived'
          )
        )

      ORDER BY
        e.enrolled_at DESC NULLS LAST,
        e.id DESC

      LIMIT 1
    `,
    [applicationId]
  );

  /* =======================================================
     NO ENROLLMENT
  ======================================================= */

  if (enrollmentResult.rows.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">

        <PageHeader
          studentName={studentName}
          admissionNumber={admissionNumber}
        />

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">

            <GraduationCap className="mx-auto h-12 w-12 text-slate-300" />

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              No LMS enrollment found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Your student account is authenticated,
              but no active LMS enrollment was found.
            </p>

            <Link
              href="/student/dashboard/courses"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to My Courses
            </Link>

          </div>

        </main>

      </div>
    );
  }

  /* =======================================================
     ENROLLMENT
  ======================================================= */

  const enrollment = enrollmentResult.rows[0];

  const programId = Number(enrollment.program_id);

  const programName =
    enrollment.program_name || 'My Course';

  /* =======================================================
     GET DOCUMENTS
  ======================================================= */

  const documentsResult = await pool.query(
    `
      SELECT
        d.id,
        d.title,
        d.description,
        d.file_name,
        d.file_url,
        d.file_size,
        d.mime_type,

        u.name AS unit_name,
        t.title AS topic_title,
        l.title AS lesson_title

      FROM lms_lesson_documents d

      INNER JOIN lms_lessons l
        ON l.id = d.lesson_id

      INNER JOIN lms_topics t
        ON t.id = l.topic_id

      INNER JOIN lms_units u
        ON u.id = t.unit_id

      WHERE u.program_id = $1

        AND LOWER(
          COALESCE(
            d.status::text,
            'active'
          )
        ) = 'active'

        AND (
          l.status IS NULL
          OR LOWER(
            l.status::text
          ) = 'active'
        )

        AND (
          t.status IS NULL
          OR LOWER(
            t.status::text
          ) = 'active'
        )

      ORDER BY
        u.id ASC,
        t.order_number ASC NULLS LAST,
        t.id ASC,
        l.order_number ASC NULLS LAST,
        l.id ASC,
        d.id ASC
    `,
    [programId]
  );

  /* =======================================================
     BUILD DOCUMENT RESOURCES
  ======================================================= */

  const documents: DocumentResource[] =
    documentsResult.rows.map((row) => ({
      id: Number(row.id),

      title:
        row.title ||
        row.file_name ||
        'Learning Material',

      description:
        row.description || null,

      fileName:
        row.file_name || null,

      fileUrl:
        row.file_url,

      fileSize:
        row.file_size !== null &&
        row.file_size !== undefined
          ? Number(row.file_size)
          : null,

      mimeType:
        row.mime_type || null,

      unitName:
        row.unit_name || 'Course Unit',

      topicTitle:
        row.topic_title || 'Topic',

      lessonTitle:
        row.lesson_title || 'Lesson',
    }));

  /* =======================================================
     GET VIDEOS
  ======================================================= */

  const videosResult = await pool.query(
    `
      SELECT
        v.id,
        v.title,
        v.description,

        v.video_url,
        v.video_file_name,
        v.video_file_url,

        v.thumbnail_url,
        v.duration_seconds,
        v.source_type,

        u.name AS unit_name,
        t.title AS topic_title,
        l.title AS lesson_title

      FROM lms_lesson_videos v

      INNER JOIN lms_lessons l
        ON l.id = v.lesson_id

      INNER JOIN lms_topics t
        ON t.id = l.topic_id

      INNER JOIN lms_units u
        ON u.id = t.unit_id

      WHERE u.program_id = $1

        AND LOWER(
          COALESCE(
            v.status::text,
            'active'
          )
        ) = 'active'

        AND (
          l.status IS NULL
          OR LOWER(
            l.status::text
          ) = 'active'
        )

        AND (
          t.status IS NULL
          OR LOWER(
            t.status::text
          ) = 'active'
        )

      ORDER BY
        u.id ASC,
        t.order_number ASC NULLS LAST,
        t.id ASC,
        l.order_number ASC NULLS LAST,
        l.id ASC,
        v.order_number ASC NULLS LAST,
        v.id ASC
    `,
    [programId]
  );

  /* =======================================================
     BUILD VIDEO RESOURCES
  ======================================================= */

  const videos: VideoResource[] =
    videosResult.rows.map((row) => ({
      id: Number(row.id),

      title:
        row.title || 'Lesson Video',

      description:
        row.description || null,

      videoUrl:
        row.video_url || null,

      videoFileName:
        row.video_file_name || null,

      videoFileUrl:
        row.video_file_url || null,

      thumbnailUrl:
        row.thumbnail_url || null,

      durationSeconds:
        row.duration_seconds !== null &&
        row.duration_seconds !== undefined
          ? Number(row.duration_seconds)
          : null,

      sourceType:
        row.source_type || null,

      unitName:
        row.unit_name || 'Course Unit',

      topicTitle:
        row.topic_title || 'Topic',

      lessonTitle:
        row.lesson_title || 'Lesson',
    }));

  /* =======================================================
     DEBUG
  ======================================================= */

  console.log(
    'STUDENT RESOURCES:',
    {
      applicationId,
      programId,
      programName,
      documentsCount: documents.length,
      videosCount: videos.length,
    }
  );

  console.log(
    'STUDENT RESOURCES - VIDEOS:',
    videos.map((video) => ({
      id: video.id,
      title: video.title,
      sourceType: video.sourceType,
      videoUrl: video.videoUrl,
      videoFileUrl: video.videoFileUrl,
    }))
  );

  /* =======================================================
     TOTAL
  ======================================================= */

  const totalResources =
    documents.length + videos.length;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">

      <PageHeader
        studentName={studentName}
        admissionNumber={admissionNumber}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* BACK */}

        <div className="mb-6">

          <Link
            href="/student/dashboard/units"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Units & Lessons
          </Link>

        </div>

        {/* HEADER */}

        <section className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 shadow-lg">

          <div className="relative p-6 sm:p-8">

            <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-white/5" />

            <div className="relative">

              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                <div>

                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">

                    <BookOpen className="h-4 w-4 text-yellow-300" />

                    Class Resources

                  </div>

                  <h1 className="text-2xl font-bold text-white sm:text-3xl">
                    Learning Resources
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100/80 sm:text-base">
                    Access all documents and videos
                    provided for your {programName}
                    course.
                  </p>

                </div>

                <div className="flex flex-wrap gap-3">

                  <ResourceBadge
                    icon={<FileText className="h-5 w-5" />}
                    value={documents.length}
                    label="Documents"
                  />

                  <ResourceBadge
                    icon={<Video className="h-5 w-5" />}
                    value={videos.length}
                    label="Videos"
                  />

                  <ResourceBadge
                    icon={<Layers3 className="h-5 w-5" />}
                    value={totalResources}
                    label="Resources"
                  />

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* DOCUMENTS */}

        <section className="mb-8">

          <div className="mb-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <FileText className="h-5 w-5" />
              </div>

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Documents & Materials
                </h2>

                <p className="text-sm text-slate-500">
                  Notes, PDFs, presentations and
                  other learning documents.
                </p>

              </div>

            </div>

          </div>

          {documents.length === 0 ? (

            <EmptyResourceState
              icon={<FileText className="h-8 w-8" />}
              title="No documents available"
              description="Learning documents uploaded for your course will appear here."
            />

          ) : (

            <div className="grid gap-4 lg:grid-cols-2">

              {documents.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                />
              ))}

            </div>

          )}

        </section>

        {/* VIDEOS */}

        <section>

          <div className="mb-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700">
                <Video className="h-5 w-5" />
              </div>

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Class Videos
                </h2>

                <p className="text-sm text-slate-500">
                  Watch videos associated with your
                  course lessons.
                </p>

              </div>

            </div>

          </div>

          {videos.length === 0 ? (

            <EmptyResourceState
              icon={<Video className="h-8 w-8" />}
              title="No videos available"
              description="Videos uploaded or linked to your course will appear here."
            />

          ) : (

            <div className="space-y-5">

              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                />
              ))}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

/* =========================================================
   PAGE HEADER
========================================================= */

function PageHeader({
  studentName,
  admissionNumber,
}: {
  studentName: string;
  admissionNumber: string | null;
}) {
  return (
    <div className="border-b border-slate-200 bg-white">

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">

              <GraduationCap className="h-4 w-4" />

              <span>Student LMS</span>

            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Class Resources
            </h1>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Welcome back, {studentName}. Access your
              course learning resources.
            </p>

          </div>

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <BookOpen className="h-5 w-5" />
            </div>

            <div>

              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Admission Number
              </p>

              <p className="text-sm font-bold text-slate-900">
                {admissionNumber || 'Not available'}
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   RESOURCE BADGE
========================================================= */

function ResourceBadge({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3">

      <div className="text-yellow-300">
        {icon}
      </div>

      <div>

        <p className="text-lg font-bold text-white">
          {value}
        </p>

        <p className="text-[11px] text-emerald-100/70">
          {label}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   DOCUMENT CARD
========================================================= */

function DocumentCard({
  document,
}: {
  document: DocumentResource;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <FileText className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900 sm:text-base">
            {document.title}
          </h3>

          {document.description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {document.description}
            </p>
          )}

          <div className="mt-3 space-y-1">
            <p className="text-[11px] font-semibold text-emerald-700">
              {document.unitName}
            </p>

            <p className="text-[11px] text-slate-500">
              {document.topicTitle} {' → '} {document.lessonTitle}
            </p>
          </div>

          {document.fileName && (
            <p className="mt-3 truncate text-[11px] text-slate-400">
              {document.fileName}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">

        {/* OPEN */}
        <a
          href={`/api/student/documents/${document.id}/view`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </a>

        {/* DOWNLOAD */}
        <a
          href={`/api/student/documents/${document.id}/download`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-900"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </a>

      </div>
    </article>
  );
}

/* =========================================================
   VIDEO CARD
========================================================= */

function VideoCard({
  video,
}: {
  video: VideoResource;
}) {
  const youtube = getYouTubeInfo(video.videoUrl);

  const vimeoEmbed =
    getVimeoEmbedUrl(video.videoUrl);

  /*
   * =======================================================
   * YOUTUBE
   * =======================================================
   *
   * If video_url contains YouTube:
   *
   * 1. Embed the YouTube video.
   * 2. Also provide a direct YouTube button.
   *
   * This means that even if YouTube does not allow embedding,
   * the student can still open the original video.
   */

  if (youtube && video.videoUrl) {
    return (
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="bg-black">

          <div className="relative aspect-video w-full">

            <iframe
              src={youtube.embedUrl}
              title={video.title}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />

          </div>

        </div>

        <div className="p-5">

          <div className="flex flex-wrap items-center gap-2">

            <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
              YouTube
            </span>

            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Class Video
            </span>

          </div>

          <h3 className="mt-3 text-base font-bold text-slate-900">
            {video.title}
          </h3>

          {video.description && (
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {video.description}
            </p>
          )}

          <div className="mt-4 rounded-xl bg-slate-50 p-4">

            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              {video.unitName}
            </p>

            <p className="mt-1 text-xs text-slate-600">
              {video.topicTitle}
              {' → '}
              {video.lessonTitle}
            </p>

          </div>

          <div className="mt-4 flex flex-wrap gap-2">

            <a
              href={video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700"
            >
              <ExternalLink className="h-4 w-4" />
              Open Directly on YouTube
            </a>

          </div>

        </div>

      </article>
    );
  }

  /* =======================================================
     VIMEO
  ======================================================= */

  if (vimeoEmbed) {
    return (
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="bg-black">

          <iframe
            src={vimeoEmbed}
            title={video.title}
            className="aspect-video w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />

        </div>

        <VideoInformation video={video} />

      </article>
    );
  }

  /* =======================================================
     UPLOADED LMS VIDEO
  ======================================================= */

  if (
    String(video.sourceType || '').toLowerCase() ===
      'upload' &&
    video.videoFileUrl
  ) {
    return (
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="bg-black">

          <video
            controls
            playsInline
            preload="metadata"
            poster={video.thumbnailUrl || undefined}
            className="aspect-video w-full bg-black object-contain"
            src={`/api/student/videos/${video.id}`}
          >
            Your browser does not support the video player.
          </video>

        </div>

        <VideoInformation video={video} />

      </article>
    );
  }

  /* =======================================================
     DIRECT VIDEO URL
  ======================================================= */

  if (video.videoUrl) {
    return (
      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="bg-black">

          <video
            controls
            playsInline
            preload="metadata"
            poster={video.thumbnailUrl || undefined}
            className="aspect-video w-full bg-black object-contain"
            src={video.videoUrl}
          >
            Your browser does not support the video player.
          </video>

        </div>

        <VideoInformation video={video} />

      </article>
    );
  }

  /* =======================================================
     UNAVAILABLE
  ======================================================= */

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="flex aspect-video items-center justify-center bg-slate-950 text-center">

        <div>

          <Video className="mx-auto h-10 w-10 text-slate-600" />

          <p className="mt-3 text-sm font-semibold text-slate-300">
            Video unavailable
          </p>

        </div>

      </div>

      <VideoInformation video={video} />

    </article>
  );
}

/* =========================================================
   VIDEO INFORMATION
========================================================= */

function VideoInformation({
  video,
}: {
  video: VideoResource;
}) {
  return (
    <div className="p-5">

      <div className="flex flex-wrap items-center gap-2">

        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
          Class Video
        </span>

        {video.sourceType && (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {video.sourceType}
          </span>
        )}

      </div>

      <h3 className="mt-3 text-base font-bold text-slate-900">
        {video.title}
      </h3>

      {video.description && (
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {video.description}
        </p>
      )}

      <div className="mt-4 rounded-xl bg-slate-50 p-4">

        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
          {video.unitName}
        </p>

        <p className="mt-1 text-xs text-slate-600">
          {video.topicTitle}
          {' → '}
          {video.lessonTitle}
        </p>

      </div>

      {video.videoUrl && !isYouTubeUrl(video.videoUrl) && (
        <div className="mt-4">

          <a
            href={video.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            <ExternalLink className="h-4 w-4" />
            Open Video Directly
          </a>

        </div>
      )}

    </div>
  );
}

/* =========================================================
   YOUTUBE HELPERS
========================================================= */

function getYouTubeInfo(
  url: string | null
): {
  videoId: string;
  embedUrl: string;
} | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    const hostname =
      parsed.hostname
        .toLowerCase()
        .replace(/^www\./, '');

    let videoId = '';

    /* youtu.be/VIDEO_ID */

    if (hostname === 'youtu.be') {
      videoId =
        parsed.pathname
          .split('/')
          .filter(Boolean)[0] || '';
    }

    /* youtube.com/watch?v=VIDEO_ID */

    else if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com'
    ) {
      videoId =
        parsed.searchParams.get('v') || '';

      /* youtube.com/shorts/VIDEO_ID */

      if (
        !videoId &&
        parsed.pathname.startsWith('/shorts/')
      ) {
        videoId =
          parsed.pathname
            .split('/')
            .filter(Boolean)[1] || '';
      }

      /* youtube.com/embed/VIDEO_ID */

      if (
        !videoId &&
        parsed.pathname.startsWith('/embed/')
      ) {
        videoId =
          parsed.pathname
            .split('/')
            .filter(Boolean)[1] || '';
      }
    }

    /*
     * YouTube video IDs are normally 11 characters.
     * We also allow a wider range to avoid breaking
     * unusual valid URLs.
     */

    if (!videoId) {
      return null;
    }

    videoId = videoId
      .split('?')[0]
      .split('&')[0]
      .trim();

    return {
      videoId,
      embedUrl:
        `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`,
    };

  } catch {
    return null;
  }
}

function isYouTubeUrl(
  url: string | null
): boolean {
  return getYouTubeInfo(url) !== null;
}

/* =========================================================
   VIMEO HELPERS
========================================================= */

function getVimeoEmbedUrl(
  url: string | null
): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    const hostname =
      parsed.hostname
        .toLowerCase()
        .replace(/^www\./, '');

    if (
      hostname !== 'vimeo.com' &&
      hostname !== 'player.vimeo.com'
    ) {
      return null;
    }

    const parts =
      parsed.pathname
        .split('/')
        .filter(Boolean);

    const videoId =
      parts[parts.length - 1];

    if (!videoId) {
      return null;
    }

    /*
     * If already a player URL, don't modify it.
     */

    if (
      hostname === 'player.vimeo.com'
    ) {
      return url;
    }

    return `https://player.vimeo.com/video/${encodeURIComponent(videoId)}`;

  } catch {
    return null;
  }
}

/* =========================================================
   EMPTY RESOURCE STATE
========================================================= */

function EmptyResourceState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
        {icon}
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-800">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

    </div>
  );
}