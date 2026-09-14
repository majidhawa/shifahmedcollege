import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireLecturer } from '@/lib/lecturer-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   HELPERS
========================================================= */

function toPositiveInt(value: string): number | null {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

function normalizeStatus(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/* =========================================================
   GET SUBMISSION
========================================================= */

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
      submissionId: string;
    }>;
  }
) {
  try {
    /* =====================================================
       AUTHENTICATE LECTURER
    ===================================================== */

    const lecturer = await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       GET ROUTE PARAMETERS
    ===================================================== */

    const { id, submissionId } = await context.params;

    const assignmentId = toPositiveInt(id);
    const submissionIdNumber = toPositiveInt(submissionId);

    if (!assignmentId || !submissionIdNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid assignment or submission ID.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       GET SUBMISSION

       IMPORTANT:
       lms_units uses `name`, NOT `title`.
    ===================================================== */

    const submissionResult = await pool.query(
      `
      SELECT
        a.id AS assignment_id,
        a.lesson_id,
        a.title AS assignment_title,
        a.description AS assignment_description,
        a.due_date,
        a.status AS assignment_status,
        a.total_marks AS assignment_total_marks,

        l.id AS lesson_id,
        l.title AS lesson_title,

        t.id AS topic_id,
        t.title AS topic_title,

        u.id AS unit_id,
        u.name AS unit_title,

        p.id AS program_id,
        p.name AS program_name,

        s.id AS submission_id,
        s.application_id,
        s.submission_text,
        s.file_name,
        s.file_url,
        s.file_size,
        s.mime_type,
        s.status AS submission_status,
        s.submitted_at,
        s.total_marks AS submission_total_marks,
        s.marks_awarded,
        s.lecturer_feedback,
        s.graded_at,
        s.graded_by

      FROM lms_assignment_submissions s

      INNER JOIN lms_assignments a
        ON a.id = s.assignment_id

      INNER JOIN lms_lessons l
        ON l.id = a.lesson_id

      INNER JOIN lms_topics t
        ON t.id = l.topic_id

      INNER JOIN lms_units u
        ON u.id = t.unit_id

      INNER JOIN lms_programs p
        ON p.id = u.program_id

      INNER JOIN lms_lecturer_programs lp
        ON lp.program_id = p.id
       AND lp.lecturer_id = $3

      WHERE a.id = $1
        AND s.id = $2

      LIMIT 1
      `,
      [
        assignmentId,
        submissionIdNumber,
        lecturer.id,
      ]
    );

    /* =====================================================
       SUBMISSION NOT FOUND
    ===================================================== */

    if (submissionResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Submission not found or you are not authorized to access it.',
        },
        { status: 404 }
      );
    }

    const submission = submissionResult.rows[0];

    /* =====================================================
       GET STUDENT APPLICATION
    ===================================================== */

    const applicationResult = await pool.query(
      `
      SELECT
        id,
        first_name,
        middle_name,
        surname,
        application_number,
        admission_number,
        email,
        mobile
      FROM applications
      WHERE id = $1
      LIMIT 1
      `,
      [submission.application_id]
    );

    const application =
      applicationResult.rows.length > 0
        ? applicationResult.rows[0]
        : null;

    /* =====================================================
       GET QUESTIONS

       NOTE:
       We DO NOT use question_number because that column
       does not exist in the database.

       Questions are ordered by ID and numbered in JS.
    ===================================================== */

    const questionsResult = await pool.query(
      `
      SELECT
        id,
        assignment_id,
        question,
        marks
      FROM lms_assignment_questions
      WHERE assignment_id = $1
      ORDER BY id ASC
      `,
      [assignmentId]
    );

    const questions = questionsResult.rows.map(
      (question, index) => ({
        ...question,
        question_number: index + 1,
      })
    );

    /* =====================================================
       GET STUDENT ANSWERS
    ===================================================== */

    const answersResult = await pool.query(
      `
      SELECT
        id,
        submission_id,
        question_id,
        answer_text,
        file_name,
        file_url,
        file_size,
        mime_type,
        marks_awarded,
        lecturer_feedback,
        graded_at
      FROM lms_assignment_answers
      WHERE submission_id = $1
      ORDER BY id ASC
      `,
      [submissionIdNumber]
    );

    /* =====================================================
       GET REQUIREMENTS
    ===================================================== */

    const requirementsResult = await pool.query(
      `
      SELECT
        id,
        assignment_id,
        requirement,
        requirement_number
      FROM lms_assignment_requirements
      WHERE assignment_id = $1
      ORDER BY requirement_number ASC, id ASC
      `,
      [assignmentId]
    );

    /* =====================================================
       RETURN COMPLETE SUBMISSION
    ===================================================== */

    return NextResponse.json({
      success: true,

      submission: {
        ...submission,

        application,

        questions,

        answers: answersResult.rows,

        requirements: requirementsResult.rows,
      },
    });

  } catch (error) {
    console.error(
      'GET lecturer submission error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load submission.',
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   PATCH / GRADE SUBMISSION
========================================================= */

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
      submissionId: string;
    }>;
  }
) {
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    /* =====================================================
       AUTHENTICATE LECTURER
    ===================================================== */

    const lecturer = await requireLecturer();

    if (!lecturer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    /* =====================================================
       GET ROUTE PARAMETERS
    ===================================================== */

    const { id, submissionId } = await context.params;

    const assignmentId = toPositiveInt(id);
    const submissionIdNumber = toPositiveInt(submissionId);

    if (!assignmentId || !submissionIdNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid assignment or submission ID.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       READ REQUEST BODY
    ===================================================== */

    let body: {
      answers?: Array<{
        answerId?: number | string;
        questionId?: number | string;
        marksAwarded?: number | string | null;
        lecturerFeedback?: string | null;
      }>;
      lecturerFeedback?: string | null;
      status?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON request body.',
        },
        { status: 400 }
      );
    }

    const submittedAnswers = Array.isArray(body.answers)
      ? body.answers
      : [];

    const requestedStatus =
      normalizeStatus(body.status) || 'graded';

    /* =====================================================
       VALIDATE STATUS
    ===================================================== */

    if (
      requestedStatus !== 'graded' &&
      requestedStatus !== 'returned'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid grading status. Expected graded or returned.',
        },
        { status: 400 }
      );
    }

    /* =====================================================
       VERIFY SUBMISSION + LECTURER ACCESS
    ===================================================== */

    const verificationResult = await client.query(
      `
      SELECT
        s.id AS submission_id,
        s.assignment_id,
        s.application_id,

        a.total_marks AS assignment_total_marks,

        p.id AS program_id,
        p.name AS program_name

      FROM lms_assignment_submissions s

      INNER JOIN lms_assignments a
        ON a.id = s.assignment_id

      INNER JOIN lms_lessons l
        ON l.id = a.lesson_id

      INNER JOIN lms_topics t
        ON t.id = l.topic_id

      INNER JOIN lms_units u
        ON u.id = t.unit_id

      INNER JOIN lms_programs p
        ON p.id = u.program_id

      INNER JOIN lms_lecturer_programs lp
        ON lp.program_id = p.id
       AND lp.lecturer_id = $3

      WHERE s.id = $1
        AND s.assignment_id = $2

      LIMIT 1
      `,
      [
        submissionIdNumber,
        assignmentId,
        lecturer.id,
      ]
    );

    if (verificationResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Submission not found or you are not authorized to grade it.',
        },
        { status: 404 }
      );
    }

    const verifiedSubmission =
      verificationResult.rows[0];

    /* =====================================================
       GET ASSIGNMENT QUESTIONS

       Again, NO question_number column.
    ===================================================== */

    const questionsResult = await client.query(
      `
      SELECT
        id,
        assignment_id,
        question,
        marks
      FROM lms_assignment_questions
      WHERE assignment_id = $1
      ORDER BY id ASC
      `,
      [assignmentId]
    );

    const questions = questionsResult.rows.map(
      (question, index) => ({
        ...question,
        question_number: index + 1,
      })
    );

    /* =====================================================
       BUILD QUESTION MAP
    ===================================================== */

    const questionMap = new Map<
      number,
      {
        id: number;
        marks: number;
        questionNumber: number;
      }
    >();

    for (const question of questions) {
      questionMap.set(Number(question.id), {
        id: Number(question.id),
        marks: Number(question.marks) || 0,
        questionNumber:
          Number(question.question_number),
      });
    }

    /* =====================================================
       GET EXISTING ANSWERS
    ===================================================== */

    const answersResult = await client.query(
      `
      SELECT
        id,
        question_id,
        marks_awarded,
        lecturer_feedback
      FROM lms_assignment_answers
      WHERE submission_id = $1
      ORDER BY id ASC
      `,
      [submissionIdNumber]
    );

    /* =====================================================
       BUILD ANSWER MAP
    ===================================================== */

    const answerMap = new Map<
      number,
      {
        id: number;
        questionId: number;
        marksAwarded: number | null;
        lecturerFeedback: string | null;
      }
    >();

    for (const answer of answersResult.rows) {
      answerMap.set(Number(answer.question_id), {
        id: Number(answer.id),
        questionId: Number(answer.question_id),
        marksAwarded:
          answer.marks_awarded === null
            ? null
            : Number(answer.marks_awarded),
        lecturerFeedback:
          answer.lecturer_feedback ?? null,
      });
    }

    /* =====================================================
       VALIDATE ANSWERS
    ===================================================== */

    type ValidatedAnswer = {
      answerId: number;
      questionId: number;
      marksAwarded: number;
      lecturerFeedback: string;
    };

    const validatedAnswers: ValidatedAnswer[] = [];

    for (const item of submittedAnswers) {
      const questionId = toPositiveInt(
        String(item.questionId ?? '')
      );

      if (!questionId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid question ID.',
          },
          { status: 400 }
        );
      }

      const question =
        questionMap.get(questionId);

      if (!question) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Question ${questionId} does not belong to this assignment.`,
          },
          { status: 400 }
        );
      }

      const existingAnswer =
        answerMap.get(questionId);

      /*
       * If the student did not submit an answer for this
       * question, there is nothing for the lecturer to grade.
       */
      if (!existingAnswer) {
        continue;
      }

      let marksAwarded = 0;

      if (
        item.marksAwarded !== null &&
        item.marksAwarded !== undefined &&
        String(item.marksAwarded).trim() !== ''
      ) {
        marksAwarded = Number(
          item.marksAwarded
        );
      }

      /* ===================================================
         VALIDATE MARK RANGE
      =================================================== */

      if (
        !Number.isFinite(marksAwarded) ||
        marksAwarded < 0 ||
        marksAwarded > question.marks
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Marks for question ${question.questionNumber} must be between 0 and ${question.marks}.`,
          },
          { status: 400 }
        );
      }

      /* ===================================================
         VALIDATE WHOLE NUMBER
      =================================================== */

      if (!Number.isInteger(marksAwarded)) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Marks for question ${question.questionNumber} must be a whole number.`,
          },
          { status: 400 }
        );
      }

      validatedAnswers.push({
        answerId: existingAnswer.id,

        questionId,

        marksAwarded,

        lecturerFeedback:
          String(
            item.lecturerFeedback ?? ''
          ).trim(),
      });
    }

    /* =====================================================
       CALCULATE TOTAL AWARDED

       Existing marks are preserved for answers that were
       not included in the PATCH.
    ===================================================== */

    const marksByQuestion =
      new Map<number, number>();

    for (const answer of answerMap.values()) {
      marksByQuestion.set(
        answer.questionId,
        answer.marksAwarded ?? 0
      );
    }

    for (const answer of validatedAnswers) {
      marksByQuestion.set(
        answer.questionId,
        answer.marksAwarded
      );
    }

    let totalAwarded = 0;

    for (const marks of marksByQuestion.values()) {
      totalAwarded += marks;
    }

    /* =====================================================
       CALCULATE MAXIMUM MARKS
    ===================================================== */

    let maximumMarks = 0;

    for (const question of questions) {
      maximumMarks +=
        Number(question.marks) || 0;
    }

    /*
     * Fallback to assignment total marks if there are
     * no question marks.
     */

    if (maximumMarks <= 0) {
      maximumMarks =
        Number(
          verifiedSubmission.assignment_total_marks
        ) || 0;
    }

    /* =====================================================
       BEGIN TRANSACTION
    ===================================================== */

    await client.query('BEGIN');

    transactionStarted = true;

    /* =====================================================
       UPDATE INDIVIDUAL ANSWERS
    ===================================================== */

    for (const answer of validatedAnswers) {
      await client.query(
        `
        UPDATE lms_assignment_answers
        SET
          marks_awarded = $1,
          lecturer_feedback = $2::text,
          graded_at = NOW()
        WHERE id = $3
          AND submission_id = $4
        `,
        [
          answer.marksAwarded,
          answer.lecturerFeedback,
          answer.answerId,
          submissionIdNumber,
        ]
      );
    }

    /* =====================================================
       UPDATE SUBMISSION
    ===================================================== */

    await client.query(
      `
      UPDATE lms_assignment_submissions
      SET
        marks_awarded = $1,
        total_marks = $2,
        lecturer_feedback = $3::text,
        status = $4::varchar,
        graded_at = NOW(),
        graded_by = $5
      WHERE id = $6
        AND assignment_id = $7
      `,
      [
        totalAwarded,
        maximumMarks,

        String(
          body.lecturerFeedback ?? ''
        ).trim(),

        requestedStatus,

        lecturer.id,

        submissionIdNumber,

        assignmentId,
      ]
    );

    /* =====================================================
       COMMIT TRANSACTION
    ===================================================== */

    await client.query('COMMIT');

    transactionStarted = false;

    /* =====================================================
       CALCULATE PERCENTAGE
    ===================================================== */

    const percentage =
      maximumMarks > 0
        ? Number(
            (
              (totalAwarded /
                maximumMarks) *
              100
            ).toFixed(2)
          )
        : 0;

    /* =====================================================
       RETURN RESULT
    ===================================================== */

    return NextResponse.json({
      success: true,

      message:
        'Submission graded successfully.',

      submissionId:
        submissionIdNumber,

      assignmentId,

      marksAwarded:
        totalAwarded,

      totalMarks:
        maximumMarks,

      percentage,

      status:
        requestedStatus,

      gradedAt:
        new Date().toISOString(),

      gradedBy:
        lecturer.id,
    });

  } catch (error) {
    /* =====================================================
       ROLLBACK
    ===================================================== */

    if (transactionStarted) {
      try {
        await client.query(
          'ROLLBACK'
        );
      } catch (rollbackError) {
        console.error(
          'ROLLBACK ERROR:',
          rollbackError
        );
      }
    }

    console.error(
      'PATCH lecturer submission error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to save the grade.',
      },
      { status: 500 }
    );

  } finally {
    client.release();
  }
}