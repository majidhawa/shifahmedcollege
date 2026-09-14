'use client';

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Film,
  Loader2,
  Upload,
  Video,
  X,
} from 'lucide-react';

/* =========================================================
   TYPES
========================================================= */

type Unit = {
  id: number;
  program_id: number;
  code: string | null;
  name: string;
  description: string | null;
  credit_hours: number | null;
  year_of_study: number | null;
  term_number: number | null;
  status: string;
  course_id: number;
  course_name: string;
  course_code: string | null;
  topic_count?: number;
};

type Topic = {
  id: number;
  unit_id: number;
  title: string;
  description: string | null;
  order_number: number;
  status: string;
};

type Lesson = {
  id: number;
  topic_id: number;
  title: string;
  description: string | null;
  content?: string | null;
  order_number: number;
  status: string;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  units?: Unit[];
  topics?: Topic[];
  lessons?: Lesson[];
  lesson?: Lesson;
};

/* =========================================================
   PAGE
========================================================= */

export default function CreateLessonVideoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const routeLessonId = Number(params?.id);

  const initialTopicId = Number(
    searchParams.get('topic_id')
  );

  const initialUnitId = Number(
    searchParams.get('unit_id')
  );

  /* =======================================================
     SELECTION STATE
  ======================================================= */

  const [selectedUnitId, setSelectedUnitId] =
    useState<number>(
      Number.isInteger(initialUnitId) &&
        initialUnitId > 0
        ? initialUnitId
        : 0
    );

  const [selectedTopicId, setSelectedTopicId] =
    useState<number>(
      Number.isInteger(initialTopicId) &&
        initialTopicId > 0
        ? initialTopicId
        : 0
    );

  const [selectedLessonId, setSelectedLessonId] =
    useState<number>(
      Number.isInteger(routeLessonId) &&
        routeLessonId > 0
        ? routeLessonId
        : 0
    );

  /* =======================================================
     DATA STATE
  ======================================================= */

  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [loadingUnits, setLoadingUnits] =
    useState(true);

  const [loadingTopics, setLoadingTopics] =
    useState(false);

  const [loadingLessons, setLoadingLessons] =
    useState(false);

  /* =======================================================
     LESSON STATE
  ======================================================= */

  const [lesson, setLesson] =
    useState<Lesson | null>(null);

  /* =======================================================
     VIDEO FORM
  ======================================================= */

  const [title, setTitle] = useState('');
  const [description, setDescription] =
    useState('');

  const [videoUrl, setVideoUrl] =
    useState('');

  const [thumbnailUrl, setThumbnailUrl] =
    useState('');

  const [durationSeconds, setDurationSeconds] =
    useState('');

  const [orderNumber, setOrderNumber] =
    useState('1');

  const [status, setStatus] =
    useState('active');

  const [sourceType, setSourceType] =
    useState<'url' | 'upload'>('url');

  /* =======================================================
     UPLOAD STATE
  ======================================================= */

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [videoFileName, setVideoFileName] =
    useState('');

  const [videoFileUrl, setVideoFileUrl] =
    useState('');

  /* =======================================================
     UI STATE
  ======================================================= */

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const selectedUnit = useMemo(
    () =>
      units.find(
        (unit) => unit.id === selectedUnitId
      ) ?? null,
    [units, selectedUnitId]
  );

  const selectedTopic = useMemo(
    () =>
      topics.find(
        (topic) => topic.id === selectedTopicId
      ) ?? null,
    [topics, selectedTopicId]
  );

  const selectedLesson = useMemo(
    () =>
      lessons.find(
        (item) =>
          item.id === selectedLessonId
      ) ?? lesson,
    [lessons, selectedLessonId, lesson]
  );

  /* =======================================================
     LOAD UNITS
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadUnits() {
      try {
        setLoadingUnits(true);
        setError('');

        const response = await fetch(
          '/api/lecturer/units',
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        const data: ApiResponse =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              'Unable to load course units.'
          );
        }

        if (!cancelled) {
          const loadedUnits =
            data.units ?? [];

          setUnits(loadedUnits);

          /*
           * If the URL did not contain a valid unit,
           * don't automatically select one.
           *
           * The lecturer should explicitly choose.
           */
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load course units.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingUnits(false);
        }
      }
    }

    loadUnits();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     LOAD TOPICS WHEN UNIT CHANGES
  ======================================================= */

  useEffect(() => {
    if (!selectedUnitId) {
      setTopics([]);
      setSelectedTopicId(0);
      setLessons([]);
      setSelectedLessonId(0);
      return;
    }

    let cancelled = false;

    async function loadTopics() {
      try {
        setLoadingTopics(true);
        setError('');

        /*
         * Reset dependent selections.
         *
         * If the page arrived with matching URL values,
         * preserve them.
         */
        const preserveTopic =
          Number.isInteger(initialTopicId) &&
          initialTopicId > 0;

        const response = await fetch(
          `/api/lecturer/topics?unit_id=${selectedUnitId}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        const data: ApiResponse =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              'Unable to load topics.'
          );
        }

        if (!cancelled) {
          const loadedTopics =
            data.topics ?? [];

          setTopics(loadedTopics);

          if (
            preserveTopic &&
            loadedTopics.some(
              (topic) =>
                topic.id === initialTopicId
            )
          ) {
            setSelectedTopicId(
              initialTopicId
            );
          } else {
            setSelectedTopicId(0);
            setLessons([]);
            setSelectedLessonId(0);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setTopics([]);
          setSelectedTopicId(0);
          setLessons([]);
          setSelectedLessonId(0);

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load topics.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingTopics(false);
        }
      }
    }

    loadTopics();

    return () => {
      cancelled = true;
    };
  }, [selectedUnitId]);

  /* =======================================================
     LOAD LESSONS WHEN TOPIC CHANGES
  ======================================================= */

  useEffect(() => {
    if (!selectedTopicId) {
      setLessons([]);
      setSelectedLessonId(0);
      setLesson(null);
      return;
    }

    let cancelled = false;

    async function loadLessons() {
      try {
        setLoadingLessons(true);
        setError('');

        const response = await fetch(
          `/api/lecturer/lessons?topic_id=${selectedTopicId}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        const data: ApiResponse =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              'Unable to load lessons.'
          );
        }

        if (!cancelled) {
          const loadedLessons =
            data.lessons ?? [];

          setLessons(loadedLessons);

          /*
           * Preserve the lesson from the URL only
           * if it actually belongs to this topic.
           */
          if (
            routeLessonId > 0 &&
            loadedLessons.some(
              (item) =>
                item.id === routeLessonId
            )
          ) {
            setSelectedLessonId(
              routeLessonId
            );

            const matchingLesson =
              loadedLessons.find(
                (item) =>
                  item.id === routeLessonId
              );

            setLesson(
              matchingLesson ?? null
            );
          } else {
            setSelectedLessonId(0);
            setLesson(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLessons([]);
          setSelectedLessonId(0);
          setLesson(null);

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load lessons.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingLessons(false);
        }
      }
    }

    loadLessons();

    return () => {
      cancelled = true;
    };
  }, [selectedTopicId]);

  /* =======================================================
     LOAD ORIGINAL LESSON IF URL HAS LESSON ID
  ======================================================= */

  useEffect(() => {
    if (
      !routeLessonId ||
      !Number.isInteger(routeLessonId)
    ) {
      return;
    }

    let cancelled = false;

    async function loadOriginalLesson() {
      try {
        const response = await fetch(
          `/api/lecturer/lessons/${routeLessonId}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        const data: ApiResponse =
          await response.json();

        if (!response.ok || !data.success) {
          return;
        }

        if (
          !cancelled &&
          data.lesson
        ) {
          setLesson(data.lesson);

          /*
           * If the URL did not contain topic_id,
           * derive it from the lesson.
           */
          if (
            data.lesson.topic_id &&
            !selectedTopicId
          ) {
            setSelectedTopicId(
              Number(data.lesson.topic_id)
            );
          }
        }
      } catch {
        /*
         * The dependent dropdown APIs remain
         * the authoritative source.
         */
      }
    }

    loadOriginalLesson();

    return () => {
      cancelled = true;
    };
  }, [routeLessonId]);

  /* =======================================================
     UNIT CHANGE
  ======================================================= */

  function handleUnitChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {
    const value = Number(event.target.value);

    setSelectedUnitId(
      Number.isInteger(value) &&
        value > 0
        ? value
        : 0
    );

    setSelectedTopicId(0);
    setSelectedLessonId(0);

    setTopics([]);
    setLessons([]);
    setLesson(null);

    setError('');
  }

  /* =======================================================
     TOPIC CHANGE
  ======================================================= */

  function handleTopicChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {
    const value = Number(event.target.value);

    setSelectedTopicId(
      Number.isInteger(value) &&
        value > 0
        ? value
        : 0
    );

    setSelectedLessonId(0);
    setLessons([]);
    setLesson(null);

    setError('');
  }

  /* =======================================================
     LESSON CHANGE
  ======================================================= */

  function handleLessonChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {
    const value = Number(event.target.value);

    const selected =
      lessons.find(
        (item) =>
          item.id === value
      ) ?? null;

    setSelectedLessonId(
      Number.isInteger(value) &&
        value > 0
        ? value
        : 0
    );

    setLesson(selected);

    setError('');
  }

  /* =======================================================
     FILE CHANGE
  ======================================================= */

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0] ?? null;

    setError('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const maxSize =
      100 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        'Video file must not exceed 100 MB.'
      );

      event.target.value = '';
      setSelectedFile(null);
      return;
    }

    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ];

    const allowedExtensions = [
      '.mp4',
      '.webm',
      '.ogg',
      '.mov',
      '.avi',
      '.mkv',
    ];

    const lowerName =
      file.name.toLowerCase();

    const extensionAllowed =
      allowedExtensions.some(
        (extension) =>
          lowerName.endsWith(extension)
      );

    const typeAllowed =
      allowedTypes.includes(file.type);

    if (
      !typeAllowed &&
      !extensionAllowed
    ) {
      setError(
        'Unsupported video format. Use MP4, WebM, OGG, MOV, AVI or MKV.'
      );

      event.target.value = '';
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setVideoFileName(file.name);
  }

  /* =======================================================
     REMOVE SELECTED FILE
  ======================================================= */

  function removeSelectedFile() {
    setSelectedFile(null);
    setVideoFileName('');
    setVideoFileUrl('');
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError('');
    setSuccess('');

    /* =====================================================
       VALIDATE HIERARCHY
    ===================================================== */

    if (!selectedUnitId) {
      setError(
        'Please select a course unit.'
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

    /*
     * Frontend relationship verification.
     */

    const topicBelongsToUnit =
      selectedTopic?.unit_id ===
      selectedUnitId;

    if (!topicBelongsToUnit) {
      setError(
        'The selected topic does not belong to the selected unit.'
      );
      return;
    }

    const lessonBelongsToTopic =
      selectedLesson?.topic_id ===
      selectedTopicId;

    if (!lessonBelongsToTopic) {
      setError(
        'The selected lesson does not belong to the selected topic.'
      );
      return;
    }

    /* =====================================================
       VALIDATE TITLE
    ===================================================== */

    if (!title.trim()) {
      setError(
        'Video title is required.'
      );
      return;
    }

    /* =====================================================
       VALIDATE SOURCE
    ===================================================== */

    if (
      sourceType === 'url' &&
      !videoUrl.trim()
    ) {
      setError(
        'Please enter the video URL.'
      );
      return;
    }

    if (
      sourceType === 'upload' &&
      !selectedFile
    ) {
      setError(
        'Please select a video file to upload.'
      );
      return;
    }

    /* =====================================================
       VALIDATE ORDER
    ===================================================== */

    const parsedOrder =
      Number(orderNumber);

    if (
      !Number.isInteger(parsedOrder) ||
      parsedOrder < 1
    ) {
      setError(
        'Order number must be a whole number greater than 0.'
      );
      return;
    }

    /* =====================================================
       VALIDATE DURATION
    ===================================================== */

    let finalDuration: number | null = null;

    if (
      durationSeconds.trim()
    ) {
      const parsedDuration =
        Number(durationSeconds);

      if (
        !Number.isInteger(
          parsedDuration
        ) ||
        parsedDuration < 0
      ) {
        setError(
          'Duration must be a valid number of seconds.'
        );
        return;
      }

      finalDuration =
        parsedDuration;
    }

    try {
      setLoading(true);

      /* ===================================================
         UPLOAD FILE FIRST
      =================================================== */

      let finalVideoFileUrl =
        videoFileUrl;

      let finalVideoFileName =
        videoFileName;

      if (
        sourceType === 'upload' &&
        selectedFile
      ) {
        const formData =
          new FormData();

        formData.append(
          'file',
          selectedFile
        );

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
          !uploadResponse.ok
        ) {
          throw new Error(
            uploadData.message ||
              'Video upload failed.'
          );
        }

        finalVideoFileUrl =
          uploadData.file
            ?.video_file_url ||
          uploadData.file
            ?.file_url ||
          '';

        finalVideoFileName =
          uploadData.file
            ?.video_file_name ||
          uploadData.file
            ?.file_name ||
          selectedFile.name;

        if (!finalVideoFileUrl) {
          throw new Error(
            'Video uploaded, but no video URL was returned.'
          );
        }
      }

      /* ===================================================
         CREATE VIDEO RECORD
      =================================================== */

      const response =
        await fetch(
          '/api/lecturer/lesson-videos',
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              lesson_id:
                selectedLessonId,

              title:
                title.trim(),

              description:
                description.trim() ||
                null,

              video_url:
                sourceType === 'url'
                  ? videoUrl.trim()
                  : '',

              thumbnail_url:
                thumbnailUrl.trim() ||
                null,

              duration_seconds:
                finalDuration,

              order_number:
                parsedOrder,

              status,

              video_file_name:
                sourceType === 'upload'
                  ? finalVideoFileName
                  : null,

              video_file_url:
                sourceType === 'upload'
                  ? finalVideoFileUrl
                  : null,

              source_type:
                sourceType,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to create lesson video.'
        );
      }

      setSuccess(
        'Video added successfully.'
      );

      /*
       * Return to video management page
       * while preserving the hierarchy.
       */

      setTimeout(() => {
        router.push(
          `/lecturer/dashboard/lessons/${selectedLessonId}/videos?topic_id=${selectedTopicId}&unit_id=${selectedUnitId}`
        );
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save video.'
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     BACK URL
  ======================================================= */

  const backUrl =
    selectedLessonId
      ? `/lecturer/dashboard/lessons/${selectedLessonId}/videos?topic_id=${selectedTopicId}&unit_id=${selectedUnitId}`
      : '/lecturer/dashboard/lessons';

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8">
          <Link
            href={backUrl}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft
              className="h-4 w-4"
            />
            Back to Videos
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Video
                className="h-6 w-6"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Add Lesson Video
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Select the course unit, topic and lesson
                before adding the video.
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <X className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Something went wrong
              </p>

              <p className="mt-1">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Success
              </p>

              <p className="mt-1">
                {success}
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* =================================================
              CONTENT HIERARCHY
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                1. Select Learning Location
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose where this video belongs in the
                curriculum.
              </p>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-3">

              {/* UNIT */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Course Unit
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <select
                    value={
                      selectedUnitId || ''
                    }
                    onChange={
                      handleUnitChange
                    }
                    disabled={
                      loadingUnits ||
                      loading
                    }
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {loadingUnits
                        ? 'Loading units...'
                        : 'Select unit'}
                    </option>

                    {units.map(
                      (unit) => (
                        <option
                          key={unit.id}
                          value={unit.id}
                        >
                          {unit.name}
                          {unit.code
                            ? ` (${unit.code})`
                            : ''}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {selectedUnit && (
                  <p className="mt-2 text-xs text-slate-500">
                    {selectedUnit.course_name}
                  </p>
                )}
              </div>

              {/* TOPIC */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Topic
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <select
                    value={
                      selectedTopicId || ''
                    }
                    onChange={
                      handleTopicChange
                    }
                    disabled={
                      !selectedUnitId ||
                      loadingTopics ||
                      loading
                    }
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {!selectedUnitId
                        ? 'Select unit first'
                        : loadingTopics
                          ? 'Loading topics...'
                          : topics.length === 0
                            ? 'No topics found'
                            : 'Select topic'}
                    </option>

                    {topics.map(
                      (topic) => (
                        <option
                          key={topic.id}
                          value={topic.id}
                        >
                          {topic.title}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* LESSON */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Lesson
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <select
                    value={
                      selectedLessonId || ''
                    }
                    onChange={
                      handleLessonChange
                    }
                    disabled={
                      !selectedTopicId ||
                      loadingLessons ||
                      loading
                    }
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
                  >
                    <option value="">
                      {!selectedTopicId
                        ? 'Select topic first'
                        : loadingLessons
                          ? 'Loading lessons...'
                          : lessons.length === 0
                            ? 'No lessons found'
                            : 'Select lesson'}
                    </option>

                    {lessons.map(
                      (item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.title}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            {/* SELECTED PATH */}

            {selectedUnit &&
              selectedTopic &&
              selectedLesson && (
                <div className="mx-6 mb-6 rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-700">
                    Video will be added to
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-purple-900">
                    <span className="font-medium">
                      {selectedUnit.course_name}
                    </span>

                    <span>→</span>

                    <span>
                      {selectedUnit.name}
                    </span>

                    <span>→</span>

                    <span>
                      {selectedTopic.title}
                    </span>

                    <span>→</span>

                    <span className="font-semibold">
                      {selectedLesson.title}
                    </span>
                  </div>
                </div>
              )}
          </section>

          {/* =================================================
              VIDEO DETAILS
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                2. Video Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the information students will see
                when accessing this video.
              </p>
            </div>

            <div className="space-y-6 p-6">

              {/* TITLE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Video Title
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Introduction to the German Language"
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Briefly describe what students will learn from this video..."
                  disabled={loading}
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
                />
              </div>

              {/* SOURCE */}

              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-700">
                  Video Source
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">

                  {/* URL */}

                  <button
                    type="button"
                    onClick={() => {
                      setSourceType('url');
                      setSelectedFile(null);
                      setVideoFileName('');
                      setVideoFileUrl('');
                    }}
                    disabled={loading}
                    className={`rounded-xl border p-4 text-left transition ${
                      sourceType === 'url'
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                        <Film className="h-5 w-5 text-slate-700" />
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">
                          Video URL
                        </p>

                        <p className="text-xs text-slate-500">
                          YouTube or external video
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* UPLOAD */}

                  <button
                    type="button"
                    onClick={() => {
                      setSourceType('upload');
                      setVideoUrl('');
                    }}
                    disabled={loading}
                    className={`rounded-xl border p-4 text-left transition ${
                      sourceType === 'upload'
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                        <Upload className="h-5 w-5 text-slate-700" />
                      </div>

                      <div>
                        <p className="font-semibold text-slate-900">
                          Upload Video
                        </p>

                        <p className="text-xs text-slate-500">
                          Maximum file size: 100 MB
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* URL */}

              {sourceType === 'url' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Video URL
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(event) =>
                      setVideoUrl(
                        event.target.value
                      )
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
                  />
                </div>
              )}

              {/* FILE */}

              {sourceType === 'upload' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Upload Video
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  {!selectedFile ? (
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-purple-400 hover:bg-purple-50">
                      <Upload className="mb-3 h-8 w-8 text-slate-400" />

                      <span className="text-sm font-semibold text-slate-700">
                        Click to select a video
                      </span>

                      <span className="mt-1 text-xs text-slate-500">
                        MP4, WebM, OGG, MOV, AVI or MKV
                        • Maximum 100 MB
                      </span>

                      <input
                        type="file"
                        accept="video/*,.mp4,.webm,.ogg,.mov,.avi,.mkv"
                        onChange={
                          handleFileChange
                        }
                        disabled={loading}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                          <Video className="h-5 w-5 text-purple-700" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {selectedFile.name}
                          </p>

                          <p className="text-xs text-slate-500">
                            {(
                              selectedFile.size /
                              (1024 * 1024)
                            ).toFixed(2)}{' '}
                            MB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          removeSelectedFile
                        }
                        disabled={loading}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* THUMBNAIL */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Thumbnail URL
                </label>

                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(event) =>
                    setThumbnailUrl(
                      event.target.value
                    )
                  }
                  placeholder="https://..."
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Optional image displayed as the video
                  thumbnail.
                </p>
              </div>

              {/* DURATION / ORDER / STATUS */}

              <div className="grid gap-6 md:grid-cols-3">

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Duration (seconds)
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      durationSeconds
                    }
                    onChange={(event) =>
                      setDurationSeconds(
                        event.target.value
                      )
                    }
                    placeholder="e.g. 600"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Display Order
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      orderNumber
                    }
                    onChange={(event) =>
                      setOrderNumber(
                        event.target.value
                      )
                    }
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Status
                  </label>

                  <div className="relative">
                    <select
                      value={status}
                      onChange={(event) =>
                        setStatus(
                          event.target.value
                        )
                      }
                      disabled={loading}
                      className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-100"
                    >
                      <option value="active">
                        Active
                      </option>

                      <option value="draft">
                        Draft
                      </option>

                      <option value="inactive">
                        Inactive
                      </option>
                    </select>

                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={backUrl}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                loading ||
                loadingUnits ||
                loadingTopics ||
                loadingLessons ||
                !selectedUnitId ||
                !selectedTopicId ||
                !selectedLessonId
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Video...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save Video
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}