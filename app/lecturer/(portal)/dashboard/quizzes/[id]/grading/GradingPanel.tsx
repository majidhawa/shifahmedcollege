'use client';

import {
useCallback,
useEffect,
useState,
} from 'react';

import {
AlertCircle,
CheckCircle2,
ChevronDown,
ChevronUp,
Clock3,
FileQuestion,
Loader2,
Save,
ShieldCheck,
UserRound,
} from 'lucide-react';

/* =========================================================
TYPES
========================================================= */

type AssessmentType =
| 'quiz'
| 'exam';

type GradingQuestion = {
id: number;
questionText: string;
questionType: string;
marks: number;
questionOrder: number;
correctAnswer: string | null;
explanation: string | null;

answerId: number | null;
answerText: string | null;
marksAwarded: number;
isCorrect: boolean | null;
graded: boolean;
};

type GradingAttempt = {
id: number;
attemptNumber: number;
studentId: number;

student: {
applicationNumber: string;
name: string;
phone: string | null;
};

startedAt: string | null;
submittedAt: string | null;

status: string;
score: number;
totalMarks: number;
percentage: number;

questions: GradingQuestion[];
};

type GradingData = {
success?: boolean;

quiz: {
id: number;
title: string;
assessmentType: AssessmentType;
totalMarks: number;
passingScore: number;

program: {
  id: number;
  name: string;
};

unit: {
  id: number;
  code: string;
  name: string;
};


};

statistics: {
attempts: number;
pendingAttempts: number;
pendingQuestions: number;
};

attempts: GradingAttempt[];
};

type SavedGrade = {
questionId: number;
marksAwarded: number;
};

type SaveAllResponse = {
success: boolean;
message?: string;

attempt?: {
id: number;
score: number;
totalMarks: number;
percentage: number;
passingScore: number;
passed: boolean;
status: string;
};

grades?: SavedGrade[];
};

/* =========================================================
HELPERS
========================================================= */

function formatQuestionType(
type: string
) {
const normalized =
type
.trim()
.toLowerCase()
.replace(/-/g, '_');

if (
normalized ===
'short_answer'
) {
return 'Short Answer';
}

return 'Essay';
}

/* =========================================================
PAGE
========================================================= */

export default function GradingPanel({
quizId,
}: {
quizId: number;
}) {
const [
data,
setData,
] =
useState<GradingData | null>(
null
);

const [
loading,
setLoading,
] =
useState(true);

const [
error,
setError,
] =
useState('');

const [
successMessage,
setSuccessMessage,
] =
useState('');

const [
expandedAttempt,
setExpandedAttempt,
] =
useState<number | null>(
null
);

const [
savingAttemptId,
setSavingAttemptId,
] =
useState<number | null>(
null
);

const [
draftMarks,
setDraftMarks,
] =
useState<
Record<string, string>
>({});

/* =======================================================
LOAD
======================================================= */

const loadGrading =
useCallback(
async () => {
try {
setLoading(true);
setError('');


      const response =
        await fetch(
          `/api/lecturer/quizzes/${quizId}/grading`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

      const result =
        (await response.json()) as
          | GradingData & {
              success: boolean;
              message?: string;
            };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            'Failed to load grading data.'
        );
      }

      setData(result);

      setExpandedAttempt(
        (previous) =>
          previous !== null &&
          result.attempts.some(
            (attempt) =>
              attempt.id ===
              previous
          )
            ? previous
            : result.attempts.length >
                0
              ? result.attempts[0].id
              : null
      );

      const initialMarks:
        Record<string, string> =
        {};

      for (
        const attempt of
          result.attempts
      ) {
        for (
          const question of
            attempt.questions
        ) {
          initialMarks[
            `${attempt.id}-${question.id}`
          ] =
            String(
              question.marksAwarded
            );
        }
      }

      setDraftMarks(
        initialMarks
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Failed to load grading data.'
      );
    } finally {
      setLoading(false);
    }
  },
  [quizId]
);

useEffect(() => {
void loadGrading();
}, [loadGrading]);

/* =======================================================
UPDATE DRAFT MARK
======================================================= */

function updateDraftMark(
attemptId: number,
questionId: number,
value: string
) {
const key =
`${attemptId}-${questionId}`;

setDraftMarks(
  (previous) => ({
    ...previous,
    [key]: value,
  })
);

setError('');
setSuccessMessage('');

}

/* =======================================================
SAVE ALL MARKS
======================================================= */

async function saveAllGrades(
attempt: GradingAttempt
) {
if (
savingAttemptId !== null
) {
return;
}


setError('');
setSuccessMessage('');

const grades: SavedGrade[] =
  [];

/* -------------------------------------------------------
   VALIDATE ALL QUESTIONS FIRST
------------------------------------------------------- */

for (
  const question of
    attempt.questions
) {
  const key =
    `${attempt.id}-${question.id}`;

  const rawValue =
    draftMarks[key] ??
    String(
      question.marksAwarded
    );

  if (
    rawValue.trim() === ''
  ) {
    setError(
      `Enter a mark for question ${question.questionOrder}.`
    );

    return;
  }

  const marks =
    Number(rawValue);

  if (
    !Number.isFinite(marks)
  ) {
    setError(
      `Enter a valid mark for question ${question.questionOrder}.`
    );

    return;
  }

  if (
    marks < 0 ||
    marks > question.marks
  ) {
    setError(
      `Question ${question.questionOrder}: marks must be between 0 and ${question.marks}.`
    );

    return;
  }

  grades.push({
    questionId:
      question.id,
    marksAwarded:
      marks,
  });
}

if (
  grades.length === 0
) {
  setError(
    'There are no written questions to grade.'
  );

  return;
}

/* -------------------------------------------------------
   SAVE EVERYTHING IN ONE REQUEST
------------------------------------------------------- */

try {
  setSavingAttemptId(
    attempt.id
  );

  const response =
    await fetch(
      `/api/lecturer/quizzes/${quizId}/grading`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          attemptId:
            attempt.id,
          grades,
        }),
      }
    );

  const result =
    (await response.json()) as
      SaveAllResponse;

  if (
    !response.ok ||
    !result.success ||
    !result.attempt
  ) {
    throw new Error(
      result.message ||
        'Failed to save marks.'
    );
  }

  const savedAttempt =
    result.attempt;

  /* -----------------------------------------------------
     UPDATE LOCAL DATA WITHOUT RELOADING
  ----------------------------------------------------- */

  setData(
    (previous) => {
      if (!previous) {
        return previous;
      }

      const updatedAttempts =
        previous.attempts.map(
          (
            currentAttempt
          ) => {
            if (
              currentAttempt.id !==
              attempt.id
            ) {
              return currentAttempt;
            }

            const updatedQuestions =
              currentAttempt.questions.map(
                (
                  question
                ) => {
                  const saved =
                    grades.find(
                      (
                        grade
                      ) =>
                        grade.questionId ===
                        question.id
                    );

                  if (
                    !saved
                  ) {
                    return question;
                  }

                  return {
                    ...question,
                    marksAwarded:
                      saved.marksAwarded,
                    graded:
                      true,
                    isCorrect:
                      saved.marksAwarded >
                      0,
                  };
                }
              );

            return {
              ...currentAttempt,

              status:
                savedAttempt.status,

              score:
                savedAttempt.score,

              totalMarks:
                savedAttempt.totalMarks,

              percentage:
                savedAttempt.percentage,

              questions:
                updatedQuestions,
            };
          }
        );

      /* -------------------------------------------------
         RECALCULATE PENDING ATTEMPTS
      ------------------------------------------------- */

      const pendingAttempts =
        updatedAttempts.filter(
          (
            currentAttempt
          ) =>
            currentAttempt.status !==
            'graded'
        ).length;

      /* -------------------------------------------------
         RECALCULATE PENDING QUESTIONS
      ------------------------------------------------- */

      const pendingQuestions =
        updatedAttempts.reduce(
          (
            total,
            currentAttempt
          ) =>
            total +
            currentAttempt.questions.filter(
              (
                question
              ) =>
                !question.graded
            ).length,
          0
        );

      return {
        ...previous,

        attempts:
          updatedAttempts,

        statistics: {
          ...previous.statistics,

          pendingAttempts,

          pendingQuestions,
        },
      };
    }
  );

  /* -----------------------------------------------------
     KEEP DRAFT VALUES IN SYNC
  ----------------------------------------------------- */

  setDraftMarks(
    (previous) => {
      const updated = {
        ...previous,
      };

      for (
        const grade of
          grades
      ) {
        updated[
          `${attempt.id}-${grade.questionId}`
        ] =
          String(
            grade.marksAwarded
          );
      }

      return updated;
    }
  );

  setSuccessMessage(
    `${attempt.student.name}'s marks were saved successfully.`
  );
} catch (saveError) {
  setError(
    saveError instanceof Error
      ? saveError.message
      : 'Failed to save marks.'
  );
} finally {
  setSavingAttemptId(
    null
  );
}

}

/* =======================================================
LOADING
======================================================= */

if (loading) {
return ( <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-soft">

```
    <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-green" />

    <p className="mt-4 text-sm font-semibold text-slate-600">
      Loading student submissions...
    </p>

  </div>
);


}

/* =======================================================
ERROR
======================================================= */

if (error && !data) {
return ( <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6">

```
    <div className="flex items-start gap-3">

      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

      <div>

        <p className="font-bold text-red-900">
          Unable to load grading
        </p>

        <p className="mt-1 text-sm text-red-700">
          {error}
        </p>

      </div>

    </div>

  </div>
);

}

if (!data) {
return null;
}

const isExam =
data.quiz.assessmentType ===
'exam';

/* =======================================================
EMPTY STATE
======================================================= */

if (
data.attempts.length === 0
) {
return ( <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-soft">

```
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-green/10">

      {isExam ? (
        <ShieldCheck className="h-8 w-8 text-brand-green" />
      ) : (
        <FileQuestion className="h-8 w-8 text-brand-green" />
      )}

    </div>

    <h2 className="mt-5 text-xl font-bold text-brand-dark">
      No submissions to grade
    </h2>

    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
      Students who submit this assessment
      and have written questions will appear
      here for manual grading.
    </p>

  </section>
);

}

/* =======================================================
RENDER
======================================================= */

return ( <div className="mt-8">

```
  {/* ==================================================
      ERROR
  ================================================== */}

  {error && (
    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">

      <div className="flex items-start gap-3">

        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

        <p className="text-sm font-semibold text-red-800">
          {error}
        </p>

      </div>

    </div>
  )}

  {/* ==================================================
      SUCCESS
  ================================================== */}

  {successMessage && (
    <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4">

      <div className="flex items-start gap-3">

        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

        <p className="text-sm font-semibold text-green-800">
          {successMessage}
        </p>

      </div>

    </div>
  )}

  {/* ==================================================
      STATISTICS
  ================================================== */}

  <section className="grid gap-5 sm:grid-cols-3">

    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">

      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        Submissions
      </p>

      <p className="mt-2 text-3xl font-bold text-brand-dark">
        {data.statistics.attempts}
      </p>

      <p className="mt-2 text-xs text-slate-400">
        Submitted attempts
      </p>

    </div>

    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-soft">

      <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
        Pending
      </p>

      <p className="mt-2 text-3xl font-bold text-amber-900">
        {data.statistics.pendingAttempts}
      </p>

      <p className="mt-2 text-xs text-amber-700">
        Attempts awaiting grading
      </p>

    </div>

    <div className="rounded-3xl border border-purple-200 bg-purple-50 p-5 shadow-soft">

      <p className="text-xs font-bold uppercase tracking-wide text-purple-600">
        Written Questions
      </p>

      <p className="mt-2 text-3xl font-bold text-purple-900">
        {data.statistics.pendingQuestions}
      </p>

      <p className="mt-2 text-xs text-purple-700">
        Questions still requiring grading
      </p>

    </div>

  </section>

  {/* ==================================================
      ATTEMPTS
  ================================================== */}

  <section className="mt-6 space-y-5">

    {data.attempts.map(
      (attempt) => {
        const expanded =
          expandedAttempt ===
          attempt.id;

        const pendingCount =
          attempt.questions.filter(
            (question) =>
              !question.graded
          ).length;

        const saving =
          savingAttemptId ===
          attempt.id;

        return (
          <article
            key={attempt.id}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft"
          >

            {/* =========================================
                STUDENT HEADER
            ========================================= */}

            <button
              type="button"
              onClick={() => {
                setExpandedAttempt(
                  expanded
                    ? null
                    : attempt.id
                );

                setError('');
                setSuccessMessage('');
              }}
              className="w-full text-left"
            >

              <div className="p-5 sm:p-6">

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div className="flex min-w-0 items-start gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-green/10">
                      <UserRound className="h-6 w-6 text-brand-green" />
                    </div>

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <h2 className="text-base font-bold text-brand-dark">
                          {attempt.student.name}
                        </h2>

                        {attempt.status ===
                        'graded' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Graded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                            <Clock3 className="h-3 w-3" />
                            Pending
                          </span>
                        )}

                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        Application:{' '}
                        <strong>
                          {attempt.student.applicationNumber}
                        </strong>
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Attempt #{attempt.attemptNumber}
                        {attempt.submittedAt
                          ? ` · Submitted ${new Date(
                              attempt.submittedAt
                            ).toLocaleString()}`
                          : ''}
                      </p>

                    </div>

                  </div>

                  <div className="flex items-center gap-3">

                    <div className="text-right">

                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Current Score
                      </p>

                      <p className="mt-1 text-lg font-bold text-brand-dark">
                        {attempt.score}
                        {' / '}
                        {attempt.totalMarks}
                      </p>

                      <p className="text-xs font-semibold text-slate-500">
                        {attempt.percentage.toFixed(2)}%
                      </p>

                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      )}
                    </div>

                  </div>

                </div>

              </div>

            </button>

            {/* =========================================
                QUESTIONS
            ========================================= */}

            {expanded && (
              <div className="border-t border-slate-100">

                {pendingCount > 0 && (
                  <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 sm:px-6">

                    <p className="text-xs font-bold text-amber-800">
                      {pendingCount}{' '}
                      {pendingCount === 1
                        ? 'question'
                        : 'questions'}{' '}
                      still need
                      {pendingCount === 1
                        ? 's'
                        : ''}{' '}
                      grading.
                    </p>

                  </div>
                )}

                <div className="divide-y divide-slate-100">

                  {attempt.questions.map(
                    (question) => {
                      const key =
                        `${attempt.id}-${question.id}`;

                      const maximum =
                        question.marks;

                      const currentMarks =
                        draftMarks[key] ??
                        String(
                          question.marksAwarded
                        );

                      return (
                        <div
                          key={question.id}
                          className="p-5 sm:p-6"
                        >

                          {/* QUESTION */}

                          <div className="flex gap-4">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green/10 text-xs font-bold text-brand-green">
                              {question.questionOrder}
                            </div>

                            <div className="min-w-0 flex-1">

                              <div className="flex flex-wrap items-center gap-2">

                                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-purple-700">
                                  {formatQuestionType(
                                    question.questionType
                                  )}
                                </span>

                                <span className="rounded-full bg-brand-gold/15 px-2.5 py-1 text-[10px] font-bold text-brand-dark">
                                  {maximum}{' '}
                                  {maximum === 1
                                    ? 'mark'
                                    : 'marks'}
                                </span>

                              </div>

                              <h3 className="mt-3 text-base font-bold leading-6 text-brand-dark">
                                {question.questionText}
                              </h3>

                            </div>

                          </div>

                          {/* STUDENT ANSWER */}

                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Student Answer
                            </p>

                            {question.answerText ? (
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                                {question.answerText}
                              </p>
                            ) : (
                              <p className="mt-3 text-sm italic text-slate-400">
                                No answer submitted.
                              </p>
                            )}

                          </div>

                          {/* MODEL ANSWER */}

                          {question.correctAnswer && (
                            <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-5">

                              <p className="text-[10px] font-bold uppercase tracking-wide text-green-600">
                                Model Answer / Marking Guide
                              </p>

                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-green-900">
                                {question.correctAnswer}
                              </p>

                            </div>
                          )}

                          {/* GRADING */}

                          <div className="mt-5 rounded-2xl border border-brand-green/20 bg-brand-green/5 p-5">

                            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                              <div>

                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                  Award Marks
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  Maximum:{' '}
                                  {maximum}{' '}
                                  {maximum === 1
                                    ? 'mark'
                                    : 'marks'}
                                </p>

                              </div>

                              <div className="flex items-center gap-3">

                                <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">

                                  <input
                                    type="number"
                                    min="0"
                                    max={
                                      maximum
                                    }
                                    step="0.01"
                                    value={
                                      currentMarks
                                    }
                                    disabled={
                                      saving
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      updateDraftMark(
                                        attempt.id,
                                        question.id,
                                        event
                                          .target
                                          .value
                                      )
                                    }
                                    className="w-24 border-0 px-3 py-2.5 text-center text-sm font-bold text-brand-dark outline-none focus:ring-2 focus:ring-brand-green disabled:bg-slate-100 disabled:opacity-60"
                                  />

                                  <span className="border-l border-slate-100 px-3 text-xs font-bold text-slate-400">
                                    /{' '}
                                    {maximum}
                                  </span>

                                </div>

                              </div>

                            </div>

                            {question.graded && (
                              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-green-700">

                                <CheckCircle2 className="h-4 w-4" />

                                Graded

                              </div>
                            )}

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

                {/* =====================================
                    SAVE ALL
                ===================================== */}

                <div className="border-t border-slate-100 bg-slate-50 p-5 sm:p-6">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <p className="text-sm font-bold text-brand-dark">
                        Ready to save this student's marks?
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Enter the marks for all written
                        questions above, then save them
                        together. The student's score and
                        percentage will be recalculated
                        automatically.
                      </p>

                    </div>

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        void saveAllGrades(
                          attempt
                        )
                      }
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-xs font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                    >

                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving All Marks...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save All Marks
                        </>
                      )}

                    </button>

                  </div>

                </div>

              </div>
            )}

          </article>
        );
      }
    )}

  </section>

</div>


);
}
