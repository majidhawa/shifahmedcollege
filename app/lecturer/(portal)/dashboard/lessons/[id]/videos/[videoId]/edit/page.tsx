'use client';

import {
  FormEvent,
  useEffect,
  useState,
  ChangeEvent,
} from 'react';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import Link from 'next/link';

import {
  ArrowLeft,
  BookOpen,
  Video,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle2,
  Link2,
  Upload,
  X,
  Layers3,
  ListTree,
  GraduationCap,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type Unit = {
  id: number;
  program_id: number;
  code?: string | null;
  name: string;
  description?: string | null;
  course_name?: string | null;
  course_code?: string | null;
  status?: string | null;
};

type Topic = {
  id: number;
  unit_id: number;
  title: string;
  description?: string | null;
  order_number?: number | null;
  status?: string | null;
};

type Lesson = {
  id: number;
  topic_id: number;
  title: string;
  description?: string | null;
  content?: string | null;
  order_number?: number | null;
  status?: string | null;
};

type VideoData = {
  id: number;
  lesson_id: number;
  title: string;
  description?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  order_number?: number | null;
  status?: string | null;
  video_file_name?: string | null;
  video_file_url?: string | null;
  source_type?: string | null;

  topic_id: number;
  unit_id: number;
  program_id?: number | null;

  program_name?: string | null;
  unit_name?: string | null;
  unit_code?: string | null;
  topic_title?: string | null;
  lesson_title?: string | null;
};

/* =========================================================
   PAGE
========================================================= */

export default function EditLessonVideoPage() {
  const router = useRouter();
  const params = useParams();

  const lessonIdParam = params?.id;
  const videoIdParam = params?.videoId;

  const numericLessonId = Number(lessonIdParam);
  const numericVideoId = Number(videoIdParam);

  /* =======================================================
     STATE
  ======================================================= */

  const [video, setVideo] =
    useState<VideoData | null>(null);

  const [units, setUnits] =
    useState<Unit[]>([]);

  const [topics, setTopics] =
    useState<Topic[]>([]);

  const [lessons, setLessons] =
    useState<Lesson[]>([]);

  const [selectedUnitId, setSelectedUnitId] =
    useState('');

  const [selectedTopicId, setSelectedTopicId] =
    useState('');

  const [selectedLessonId, setSelectedLessonId] =
    useState('');

  const [title, setTitle] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [sourceType, setSourceType] =
    useState<'url' | 'upload'>('url');

  const [videoUrl, setVideoUrl] =
    useState('');

  const [thumbnailUrl, setThumbnailUrl] =
    useState('');

  const [duration, setDuration] =
    useState('');

  const [orderNumber, setOrderNumber] =
    useState('1');

  const [status, setStatus] =
    useState('active');

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [videoFileName, setVideoFileName] =
    useState('');

  const [videoFileUrl, setVideoFileUrl] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [loadingTopics, setLoadingTopics] =
    useState(false);

  const [loadingLessons, setLoadingLessons] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  /* =========================================================
     VALIDATE IDS
  ========================================================= */

  const validIds =
    Number.isInteger(numericLessonId) &&
    numericLessonId > 0 &&
    Number.isInteger(numericVideoId) &&
    numericVideoId > 0;

  /* =========================================================
     LOAD EXISTING VIDEO
  ========================================================= */

  useEffect(() => {
    if (!validIds) {
      setLoading(false);
      return;
    }

    const loadVideo = async () => {
      try {
        setLoading(true);
        setError('');

        const response =
          await fetch(
            `/api/lecturer/lesson-videos/${numericVideoId}`,
            {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              'Unable to load lesson video.'
          );
        }

        /*
         * The API may return the video directly
         * or inside data.video.
         */

        const existingVideo: VideoData =
          data.video || data;

        setVideo(existingVideo);

        /* -----------------------------------------------
           BASIC VIDEO FIELDS
        ----------------------------------------------- */

        setTitle(
          existingVideo.title || ''
        );

        setDescription(
          existingVideo.description || ''
        );

        setVideoUrl(
          existingVideo.video_url || ''
        );

        setThumbnailUrl(
          existingVideo.thumbnail_url || ''
        );

        setDuration(
          existingVideo.duration_seconds !== null &&
          existingVideo.duration_seconds !== undefined
            ? String(
                existingVideo.duration_seconds
              )
            : ''
        );

        setOrderNumber(
          existingVideo.order_number !== null &&
          existingVideo.order_number !== undefined
            ? String(
                existingVideo.order_number
              )
            : '1'
        );

        setStatus(
          existingVideo.status === 'inactive'
            ? 'inactive'
            : 'active'
        );

        setVideoFileName(
          existingVideo.video_file_name || ''
        );

        setVideoFileUrl(
          existingVideo.video_file_url || ''
        );

        /*
         * Determine source type.
         *
         * If the API says upload, use upload.
         * Otherwise, if a video file exists, use upload.
         * Otherwise use URL.
         */

        if (
          existingVideo.source_type ===
            'upload' ||
          existingVideo.video_file_url
        ) {
          setSourceType('upload');
        } else {
          setSourceType('url');
        }

        /* -----------------------------------------------
           HIERARCHY
        ----------------------------------------------- */

        if (
          existingVideo.unit_id
        ) {
          setSelectedUnitId(
            String(existingVideo.unit_id)
          );
        }

        if (
          existingVideo.topic_id
        ) {
          setSelectedTopicId(
            String(existingVideo.topic_id)
          );
        }

        if (
          existingVideo.lesson_id
        ) {
          setSelectedLessonId(
            String(existingVideo.lesson_id)
          );
        }

      } catch (err) {
        console.error(
          'LOAD LESSON VIDEO ERROR:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load lesson video.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [
    numericVideoId,
    validIds,
  ]);

  /* =========================================================
     LOAD LECTURER UNITS
  ========================================================= */

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const response =
          await fetch(
            '/api/lecturer/units',
            {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              'Unable to load units.'
          );
        }

        setUnits(
          Array.isArray(data.units)
            ? data.units
            : []
        );

      } catch (err) {
        console.error(
          'LOAD UNITS ERROR:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load units.'
        );
      }
    };

    loadUnits();
  }, []);

  /* =========================================================
     LOAD TOPICS WHEN UNIT CHANGES
  ========================================================= */

  useEffect(() => {
    if (!selectedUnitId) {
      setTopics([]);
      return;
    }

    const loadTopics = async () => {
      try {
        setLoadingTopics(true);

        const response =
          await fetch(
            `/api/lecturer/topics?unit_id=${selectedUnitId}`,
            {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              'Unable to load topics.'
          );
        }

        setTopics(
          Array.isArray(data.topics)
            ? data.topics
            : []
        );

      } catch (err) {
        console.error(
          'LOAD TOPICS ERROR:',
          err
        );

        setTopics([]);

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load topics.'
        );
      } finally {
        setLoadingTopics(false);
      }
    };

    loadTopics();
  }, [selectedUnitId]);

  /* =========================================================
     LOAD LESSONS WHEN TOPIC CHANGES
  ========================================================= */

  useEffect(() => {
    if (!selectedTopicId) {
      setLessons([]);
      return;
    }

    const loadLessons = async () => {
      try {
        setLoadingLessons(true);

        const response =
          await fetch(
            `/api/lecturer/lessons?topic_id=${selectedTopicId}`,
            {
              method: 'GET',
              credentials: 'include',
              cache: 'no-store',
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              'Unable to load lessons.'
          );
        }

        setLessons(
          Array.isArray(data.lessons)
            ? data.lessons
            : []
        );

      } catch (err) {
        console.error(
          'LOAD LESSONS ERROR:',
          err
        );

        setLessons([]);

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load lessons.'
        );
      } finally {
        setLoadingLessons(false);
      }
    };

    loadLessons();
  }, [selectedTopicId]);

  /* =========================================================
     FILE CHANGE
  ========================================================= */

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError('');
    setSuccess('');

    const maxFileSize =
      100 * 1024 * 1024;

    if (file.size > maxFileSize) {
      setSelectedFile(null);
      setVideoFileName('');

      setError(
        'The selected video is too large. Maximum file size is 100 MB.'
      );

      event.target.value = '';

      return;
    }

    const allowedExtensions = [
      '.mp4',
      '.webm',
      '.mov',
      '.avi',
      '.mkv',
      '.m4v',
      '.ogg',
    ];

    const lowerName =
      file.name.toLowerCase();

    const validExtension =
      allowedExtensions.some(
        (extension) =>
          lowerName.endsWith(extension)
      );

    const validMime =
      file.type.startsWith('video/');

    if (
      !validExtension &&
      !validMime
    ) {
      setSelectedFile(null);
      setVideoFileName('');

      setError(
        'Unsupported video type. Please upload MP4, WebM, MOV, AVI, MKV, M4V or OGG.'
      );

      event.target.value = '';

      return;
    }

    setSelectedFile(file);
    setVideoFileName(file.name);
  };

  /* =========================================================
     REMOVE SELECTED REPLACEMENT
  ========================================================= */

  const removeSelectedFile = () => {
    setSelectedFile(null);

    /*
     * If an existing uploaded video exists,
     * restore its filename rather than removing
     * the existing database video.
     */

    setVideoFileName(
      video?.video_file_name || ''
    );

    setVideoFileUrl(
      video?.video_file_url || ''
    );

    const input =
      document.getElementById(
        'videoFile'
      ) as HTMLInputElement | null;

    if (input) {
      input.value = '';
    }
  };

  /* =========================================================
     UNIT CHANGE
  ========================================================= */

  const handleUnitChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const value =
      event.target.value;

    setSelectedUnitId(value);

    /*
     * Changing Unit resets Topic and Lesson.
     */

    setSelectedTopicId('');
    setSelectedLessonId('');

    setTopics([]);
    setLessons([]);

    setError('');
  };

  /* =========================================================
     TOPIC CHANGE
  ========================================================= */

  const handleTopicChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const value =
      event.target.value;

    setSelectedTopicId(value);

    /*
     * Changing Topic resets Lesson.
     */

    setSelectedLessonId('');

    setLessons([]);

    setError('');
  };

  /* =========================================================
     LESSON CHANGE
  ========================================================= */

  const handleLessonChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedLessonId(
      event.target.value
    );

    setError('');
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    /* -----------------------------------------------
       HIERARCHY VALIDATION
    ----------------------------------------------- */

    if (!selectedUnitId) {
      setError(
        'Please select a unit.'
      );
      return;
    }

    if (!selectedTopicId) {
      setError(
        'Please select a topic.'
      );
      return;
    }

    if (!selectedLessonId) {
      setError(
        'Please select a lesson.'
      );
      return;
    }

    /* -----------------------------------------------
       TITLE
    ----------------------------------------------- */

    if (!title.trim()) {
      setError(
        'Video title is required.'
      );
      return;
    }

    /* -----------------------------------------------
       SOURCE
    ----------------------------------------------- */

    if (
      sourceType === 'url' &&
      !videoUrl.trim()
    ) {
      setError(
        'Please provide a video URL.'
      );
      return;
    }

    /*
     * For uploads, an existing uploaded video
     * is acceptable if the lecturer has not
     * selected a replacement.
     */

    if (
      sourceType === 'upload' &&
      !selectedFile &&
      !videoFileUrl
    ) {
      setError(
        'Please select a video to upload.'
      );
      return;
    }

    /* -----------------------------------------------
       DURATION
    ----------------------------------------------- */

    const parsedDuration =
      duration.trim()
        ? Number(duration)
        : null;

    if (
      parsedDuration !== null &&
      (!Number.isFinite(parsedDuration) ||
        parsedDuration < 0)
    ) {
      setError(
        'Duration must be a valid number of seconds.'
      );
      return;
    }

    /* -----------------------------------------------
       ORDER
    ----------------------------------------------- */

    const parsedOrder =
      Number(orderNumber);

    if (
      !Number.isInteger(parsedOrder) ||
      parsedOrder <= 0
    ) {
      setError(
        'Order number must be a positive whole number.'
      );
      return;
    }

    try {
      setSaving(true);

      let finalVideoUrl =
        videoUrl.trim();

      let finalVideoFileName =
        videoFileName.trim();

      let finalVideoFileUrl =
        videoFileUrl.trim();

      /* =================================================
         UPLOAD REPLACEMENT VIDEO
      ================================================= */

      if (
        sourceType === 'upload' &&
        selectedFile
      ) {
        setUploading(true);

        const formData =
          new FormData();

        formData.append(
          'file',
          selectedFile
        );

        /*
         * Upload against the selected lesson,
         * not merely the original lesson.
         */

        formData.append(
          'lesson_id',
          String(selectedLessonId)
        );

        const uploadResponse =
          await fetch(
            '/api/lecturer/lesson-videos/upload',
            {
              method: 'POST',
              credentials: 'include',
              body: formData,
            }
          );

        const uploadData =
          await uploadResponse.json();

        if (
          !uploadResponse.ok ||
          !uploadData.success
        ) {
          throw new Error(
            uploadData.message ||
              'Unable to upload replacement video.'
          );
        }

        finalVideoFileName =
          uploadData.video?.file_name ||
          uploadData.file?.file_name ||
          selectedFile.name;

        finalVideoFileUrl =
          uploadData.video?.file_url ||
          uploadData.file?.file_url ||
          '';

        if (!finalVideoFileUrl) {
          throw new Error(
            'The video was uploaded but no video URL was returned.'
          );
        }

        /*
         * Keep video_url populated for playback.
         */

        finalVideoUrl =
          finalVideoFileUrl;

        setVideoFileName(
          finalVideoFileName
        );

        setVideoFileUrl(
          finalVideoFileUrl
        );

        setVideoUrl(
          finalVideoUrl
        );

        setUploading(false);
      }

      /* =================================================
         UPDATE DATABASE RECORD
      ================================================= */

      const response =
        await fetch(
          `/api/lecturer/lesson-videos/${numericVideoId}`,
          {
            method: 'PUT',
            credentials: 'include',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              unit_id:
                Number(selectedUnitId),

              topic_id:
                Number(selectedTopicId),

              lesson_id:
                Number(selectedLessonId),

              title:
                title.trim(),

              description:
                description.trim() ||
                null,

              video_url:
                sourceType === 'url'
                  ? finalVideoUrl
                  : finalVideoUrl,

              thumbnail_url:
                thumbnailUrl.trim() ||
                null,

              duration_seconds:
                parsedDuration !== null
                  ? Math.trunc(
                      parsedDuration
                    )
                  : null,

              order_number:
                parsedOrder,

              status,

              video_file_name:
                sourceType === 'upload'
                  ? finalVideoFileName ||
                    null
                  : null,

              video_file_url:
                sourceType === 'upload'
                  ? finalVideoFileUrl ||
                    null
                  : null,

              source_type:
                sourceType,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            'Unable to update lesson video.'
        );
      }

      setSuccess(
        'Lesson video updated successfully.'
      );

      /*
       * Return to the selected lesson's
       * video list.
       */

      setTimeout(() => {
        router.push(
          `/lecturer/dashboard/lessons/${Number(
            selectedLessonId
          )}/videos`
        );

        router.refresh();
      }, 700);

    } catch (err) {
      console.error(
        'UPDATE LESSON VIDEO ERROR:',
        err
      );

      setUploading(false);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update lesson video.'
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  /* =========================================================
     INVALID IDS
  ========================================================= */

  if (!validIds) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          <Link
            href="/lecturer/dashboard/lessons"
            className="mb-6 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-slate-500 hover:bg-brand-green/5 hover:text-brand-green"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Lessons
          </Link>

          <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>

              <div>
                <h1 className="text-lg font-bold text-red-700">
                  Invalid Video
                </h1>

                <p className="mt-1 text-sm text-red-600">
                  A valid lesson ID and video ID are required.
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    );
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-soft">

            <div className="text-center">

              <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-green" />

              <p className="mt-3 text-sm font-semibold text-slate-500">
                Loading video details...
              </p>

            </div>

          </div>

        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        {/* ===================================================
           BACK
        =================================================== */}

        <Link
          href={`/lecturer/dashboard/lessons/${numericLessonId}/videos`}
          className="mb-6 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-slate-500 transition hover:bg-brand-green/5 hover:text-brand-green"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Videos
        </Link>

        {/* ===================================================
           HEADER
        =================================================== */}

        <div className="mb-6">

          <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-brand-green/5 px-3 py-2 text-xs font-bold text-brand-green">
            <BookOpen className="h-4 w-4" />
            Lesson Video
          </div>

          <h1 className="text-2xl font-bold text-brand-dark sm:text-3xl">
            Edit Lesson Video
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Update the video information, learning
            hierarchy, source, or publication status.
          </p>

        </div>

        {/* ===================================================
           SUCCESS
        =================================================== */}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">

            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />

            <p className="text-sm font-semibold text-green-700">
              {success}
            </p>

          </div>
        )}

        {/* ===================================================
           ERROR
        =================================================== */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">

            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />

            <p className="text-sm font-semibold text-red-700">
              {error}
            </p>

          </div>
        )}

        {/* ===================================================
           FORM
        =================================================== */}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft"
        >

          {/* =================================================
             FORM HEADER
          ================================================= */}

          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">

            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-green/10">
                <Video className="h-5 w-5 text-brand-green" />
              </div>

              <div>
                <h2 className="font-bold text-brand-dark">
                  Edit Video
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Update where this video belongs and
                  modify its content.
                </p>
              </div>

            </div>

          </div>

          {/* =================================================
             FORM BODY
          ================================================= */}

          <div className="space-y-8 p-5 sm:p-6">

            {/* =================================================
               LEARNING HIERARCHY
            ================================================= */}

            <section>

              <div className="mb-5">

                <div className="flex items-center gap-2">

                  <Layers3 className="h-5 w-5 text-brand-green" />

                  <h3 className="font-bold text-brand-dark">
                    Learning Hierarchy
                  </h3>

                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Choose the Unit, Topic and Lesson where
                  this video should belong.
                </p>

              </div>

              <div className="grid gap-5 lg:grid-cols-3">

                {/* UNIT */}

                <div>

                  <label
                    htmlFor="unit"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Unit
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <div className="relative">

                    <Layers3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <select
                      id="unit"
                      value={selectedUnitId}
                      onChange={handleUnitChange}
                      disabled={
                        saving ||
                        uploading
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:bg-slate-50"
                    >

                      <option value="">
                        Select Unit
                      </option>

                      {units.map((unit) => (
                        <option
                          key={unit.id}
                          value={unit.id}
                        >
                          {unit.code
                            ? `${unit.code} — ${unit.name}`
                            : unit.name}
                        </option>
                      ))}

                    </select>

                  </div>

                </div>

                {/* TOPIC */}

                <div>

                  <label
                    htmlFor="topic"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Topic
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <div className="relative">

                    <ListTree className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <select
                      id="topic"
                      value={selectedTopicId}
                      onChange={handleTopicChange}
                      disabled={
                        !selectedUnitId ||
                        loadingTopics ||
                        saving ||
                        uploading
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:bg-slate-50"
                    >

                      <option value="">
                        {loadingTopics
                          ? 'Loading Topics...'
                          : selectedUnitId
                          ? 'Select Topic'
                          : 'Select Unit First'}
                      </option>

                      {topics.map((topic) => (
                        <option
                          key={topic.id}
                          value={topic.id}
                        >
                          {topic.title}
                        </option>
                      ))}

                    </select>

                  </div>

                </div>

                {/* LESSON */}

                <div>

                  <label
                    htmlFor="lesson"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Lesson
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <div className="relative">

                    <GraduationCap className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <select
                      id="lesson"
                      value={selectedLessonId}
                      onChange={handleLessonChange}
                      disabled={
                        !selectedTopicId ||
                        loadingLessons ||
                        saving ||
                        uploading
                      }
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:bg-slate-50"
                    >

                      <option value="">
                        {loadingLessons
                          ? 'Loading Lessons...'
                          : selectedTopicId
                          ? 'Select Lesson'
                          : 'Select Topic First'}
                      </option>

                      {lessons.map((lesson) => (
                        <option
                          key={lesson.id}
                          value={lesson.id}
                        >
                          {lesson.title}
                        </option>
                      ))}

                    </select>

                  </div>

                </div>

              </div>

              {/* CURRENT LOCATION */}

              {video && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Current Video Location
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">

                    <span className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-600">
                      {video.unit_name ||
                        'Current Unit'}
                    </span>

                    <span className="text-slate-300">
                      →
                    </span>

                    <span className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-600">
                      {video.topic_title ||
                        'Current Topic'}
                    </span>

                    <span className="text-slate-300">
                      →
                    </span>

                    <span className="rounded-lg bg-white px-3 py-1.5 font-semibold text-slate-600">
                      {video.lesson_title ||
                        'Current Lesson'}
                    </span>

                  </div>

                </div>
              )}

            </section>

            {/* =================================================
               VIDEO DETAILS
            ================================================= */}

            <section className="border-t border-slate-100 pt-7">

              <div className="mb-5">

                <div className="flex items-center gap-2">

                  <Video className="h-5 w-5 text-brand-green" />

                  <h3 className="font-bold text-brand-dark">
                    Video Details
                  </h3>

                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Update the title, description and video
                  source.
                </p>

              </div>

              {/* TITLE */}

              <div className="mb-6">

                <label
                  htmlFor="title"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Video Title
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Introduction to Emergency Medical Technology"
                  disabled={
                    saving ||
                    uploading
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:bg-slate-50"
                />

              </div>

              {/* DESCRIPTION */}

              <div className="mb-6">

                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Briefly describe this video..."
                  disabled={
                    saving ||
                    uploading
                  }
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 disabled:bg-slate-50"
                />

              </div>

              {/* SOURCE TYPE */}

              <div>

                <label className="mb-3 block text-sm font-bold text-slate-700">
                  Video Source
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="mb-4 flex rounded-xl bg-slate-100 p-1">

                  <button
                    type="button"
                    onClick={() => {
                      setSourceType('url');
                      setSelectedFile(null);
                      setVideoFileName('');
                      setVideoFileUrl('');
                      setError('');
                    }}
                    disabled={
                      saving ||
                      uploading
                    }
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold ${
                      sourceType === 'url'
                        ? 'bg-white text-brand-green shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    <Link2 className="h-4 w-4" />
                    Video URL
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSourceType('upload');
                      setError('');
                    }}
                    disabled={
                      saving ||
                      uploading
                    }
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold ${
                      sourceType === 'upload'
                        ? 'bg-white text-brand-green shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Video
                  </button>

                </div>

                {/* URL */}

                {sourceType === 'url' ? (
                  <div>

                    <div className="relative">

                      <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(event) =>
                          setVideoUrl(
                            event.target.value
                          )
                        }
                        placeholder="https://example.com/video.mp4"
                        disabled={
                          saving ||
                          uploading
                        }
                        className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
                      />

                    </div>

                    <p className="mt-1.5 text-xs text-slate-400">
                      Enter a public video URL.
                    </p>

                  </div>
                ) : (
                  <div>

                    {/* EXISTING UPLOAD */}

                    {video?.video_file_url &&
                      !selectedFile && (
                        <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-4">

                          <div className="flex items-start justify-between gap-4">

                            <div>

                              <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                                Current Uploaded Video
                              </p>

                              <p className="mt-1 text-sm font-bold text-green-700">
                                {video.video_file_name ||
                                  'Uploaded video'}
                              </p>

                            </div>

                            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-green-600">
                              Existing
                            </span>

                          </div>

                          <p className="mt-2 text-xs text-green-600">
                            Leave this unchanged to keep
                            the existing uploaded video.
                            Select a new file below to
                            replace it.
                          </p>

                        </div>
                      )}

                    {/* FILE INPUT */}

                    <label
                      htmlFor="videoFile"
                      className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center transition hover:border-brand-green/40 hover:bg-brand-green/5"
                    >

                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10">
                        <Upload className="h-6 w-6 text-brand-green" />
                      </div>

                      <p className="text-sm font-bold text-slate-700">
                        {selectedFile
                          ? selectedFile.name
                          : 'Click to choose a replacement video'}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        MP4, WebM, MOV, AVI, MKV, M4V or OGG
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Maximum size: 100 MB
                      </p>

                      <input
                        id="videoFile"
                        type="file"
                        accept="video/*,.mp4,.webm,.mov,.avi,.mkv,.m4v,.ogg"
                        onChange={
                          handleFileChange
                        }
                        disabled={
                          saving ||
                          uploading
                        }
                        className="hidden"
                      />

                    </label>

                    {/* NEW FILE */}

                    {selectedFile && (
                      <div className="mt-3 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3">

                        <div className="min-w-0">

                          <p className="truncate text-sm font-bold text-green-700">
                            {selectedFile.name}
                          </p>

                          <p className="mt-1 text-xs text-green-600">
                            {(
                              selectedFile.size /
                              1024 /
                              1024
                            ).toFixed(2)}{' '}
                            MB
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={
                            removeSelectedFile
                          }
                          disabled={
                            saving ||
                            uploading
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-green-600 hover:bg-green-100"
                        >
                          <X className="h-4 w-4" />
                        </button>

                      </div>
                    )}

                  </div>
                )}

              </div>

            </section>

            {/* =================================================
               OTHER SETTINGS
            ================================================= */}

            <section className="border-t border-slate-100 pt-7">

              <div className="mb-5">

                <h3 className="font-bold text-brand-dark">
                  Video Settings
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Configure the thumbnail, duration,
                  order and status.
                </p>

              </div>

              {/* THUMBNAIL */}

              <div className="mb-6">

                <label
                  htmlFor="thumbnailUrl"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Thumbnail URL
                </label>

                <input
                  id="thumbnailUrl"
                  type="url"
                  value={thumbnailUrl}
                  onChange={(event) =>
                    setThumbnailUrl(
                      event.target.value
                    )
                  }
                  placeholder="https://example.com/thumbnail.jpg"
                  disabled={
                    saving ||
                    uploading
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  Optional image URL displayed as the
                  video thumbnail.
                </p>

              </div>

              {/* DURATION + ORDER */}

              <div className="grid gap-5 sm:grid-cols-2">

                <div>

                  <label
                    htmlFor="duration"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Duration
                  </label>

                  <input
                    id="duration"
                    type="number"
                    min="0"
                    value={duration}
                    onChange={(event) =>
                      setDuration(
                        event.target.value
                      )
                    }
                    placeholder="e.g. 600"
                    disabled={
                      saving ||
                      uploading
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
                  />

                  <p className="mt-1.5 text-xs text-slate-400">
                    Duration in seconds.
                  </p>

                </div>

                <div>

                  <label
                    htmlFor="orderNumber"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Order Number
                  </label>

                  <input
                    id="orderNumber"
                    type="number"
                    min="1"
                    value={orderNumber}
                    onChange={(event) =>
                      setOrderNumber(
                        event.target.value
                      )
                    }
                    disabled={
                      saving ||
                      uploading
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
                  />

                  <p className="mt-1.5 text-xs text-slate-400">
                    Determines the video's position
                    within the lesson.
                  </p>

                </div>

              </div>

              {/* STATUS */}

              <div className="mt-6">

                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Status
                </label>

                <select
                  id="status"
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value
                    )
                  }
                  disabled={
                    saving ||
                    uploading
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10"
                >

                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>

                </select>

                <p className="mt-1.5 text-xs text-slate-400">
                  Inactive videos remain available for
                  later editing.
                </p>

              </div>

            </section>

          </div>

          {/* =================================================
             ACTIONS
          ================================================= */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-5 sm:flex-row sm:justify-end sm:px-6">

            <Link
              href={`/lecturer/dashboard/lessons/${numericLessonId}/videos`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                saving ||
                uploading
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >

              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}

            </button>

          </div>

        </form>

      </div>
    </div>
  );
}