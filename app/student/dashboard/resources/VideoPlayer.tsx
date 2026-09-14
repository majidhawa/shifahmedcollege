'use client';

import {
  useState,
} from 'react';

import {
  ExternalLink,
  Video,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

interface VideoPlayerProps {
  videoId: number;
  title: string;

  uploadedVideoUrl:
    | string
    | null;

  youtubeUrl:
    | string
    | null;

  thumbnailUrl:
    | string
    | null;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function VideoPlayer({
  videoId,
  title,
  uploadedVideoUrl,
  youtubeUrl,
  thumbnailUrl,
}: VideoPlayerProps) {
  /*
   * false = try uploaded LMS video
   * true  = uploaded video failed, use YouTube
   */
  const [uploadedFailed, setUploadedFailed] =
    useState(false);

  /*
   * Convert YouTube URL into embed URL.
   */
  const youtubeEmbedUrl =
    youtubeUrl
      ? getYouTubeEmbedUrl(
          youtubeUrl
        )
      : null;

  /* =======================================================
     UPLOADED VIDEO FAILED
  ======================================================= */

  if (
    uploadedFailed &&
    youtubeEmbedUrl
  ) {
    return (
      <div className="relative aspect-video w-full bg-black">

        <iframe
          src={youtubeEmbedUrl}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />

        {/* ===============================================
            YOUTUBE FALLBACK LABEL
        =============================================== */}

        <div className="absolute bottom-3 left-3">

          <a
            href={
              youtubeUrl ||
              '#'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-black/75 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-black"
          >

            <ExternalLink className="h-3.5 w-3.5" />

            Open on YouTube

          </a>

        </div>

      </div>
    );
  }

  /* =======================================================
     TRY UPLOADED LMS VIDEO
  ======================================================= */

  if (
    uploadedVideoUrl &&
    !uploadedFailed
  ) {
    return (
      <div className="relative bg-black">

        <video
          key={`uploaded-video-${videoId}`}
          controls
          playsInline
          preload="metadata"
          poster={
            thumbnailUrl ||
            undefined
          }
          className="aspect-video w-full bg-black object-contain"
          src={uploadedVideoUrl}
          onError={(event) => {
            console.error(
              'STUDENT VIDEO PLAYER - UPLOADED VIDEO FAILED:',
              {
                videoId,
                title,
                src:
                  uploadedVideoUrl,
                error:
                  event.currentTarget.error,
              }
            );

            /*
             * Switch to YouTube.
             */
            setUploadedFailed(
              true
            );
          }}
        >
          Your browser does not support
          the video player.
        </video>

        {/* ===============================================
            LOADING / SOURCE INFORMATION
        =============================================== */}

        <div className="pointer-events-none absolute left-3 top-3">

          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
            LMS Video
          </span>

        </div>

      </div>
    );
  }

  /* =======================================================
     YOUTUBE ONLY
  ======================================================= */

  if (youtubeEmbedUrl) {
    return (
      <div className="relative aspect-video w-full bg-black">

        <iframe
          src={youtubeEmbedUrl}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />

      </div>
    );
  }

  /* =======================================================
     NO VIDEO
  ======================================================= */

  return (
    <div className="flex aspect-video items-center justify-center bg-slate-950 text-center">

      <div>

        <Video className="mx-auto h-10 w-10 text-slate-600" />

        <p className="mt-3 text-sm font-semibold text-slate-300">
          Video unavailable
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   YOUTUBE URL CONVERTER
========================================================= */

function getYouTubeEmbedUrl(
  url: string
): string {
  try {
    const parsed =
      new URL(url);

    let videoId = '';

    /*
     * youtu.be/VIDEO_ID
     */
    if (
      parsed.hostname
        .toLowerCase()
        .includes(
          'youtu.be'
        )
    ) {
      videoId =
        parsed.pathname
          .replace(
            '/',
            ''
          )
          .trim();
    }

    /*
     * youtube.com/watch?v=VIDEO_ID
     */
    else {
      videoId =
        parsed.searchParams.get(
          'v'
        ) || '';
    }

    /*
     * If we cannot extract
     * the ID, return original.
     */
    if (!videoId) {
      return url;
    }

    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return url;
  }
}