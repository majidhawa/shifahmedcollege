import { NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   GET
   /api/student/assignments/[id]
========================================================= */

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    /* =======================================================
       AUTHENTICATION
    ======================================================= */

    const session = await getStudentSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: 'Student session has expired.',
        },
        { status: 401 }
      );
    }

    const applicationId =
      Number(session.applicationId);

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid student session.',
        },
        { status: 401 }
      );
    }

    /* =======================================================
       ASSIGNMENT ID
    ======================================================= */

    const { id } = await context.params;

    const assignmentId = Number(id);

    if (
      !Number.isInteger(assignmentId) ||
      assignmentId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid assignment ID.',
        },
        { status: 400 }
      );
    }

    /* =======================================================
       GET ASSIGNMENT
       
       IMPORTANT:
       Authorization happens through:

       application
           ↓
       enrollment
           ↓
       program
           ↓
       unit
           ↓
       topic
           ↓
       lesson
           ↓
       assignment
    ======================================================= */

    const assignmentResult =
      await pool.query(
        `
          SELECT
            a.id,
            a.lesson_id,

            a.title,
            a.description,
            a.due_date,
            a.status,
            a.total_marks,

            a.created_at,
            a.updated_at,

            l.title AS lesson_title,

            t.id AS topic_id,
            t.title AS topic_title,

            u.id AS unit_id,
            u.name AS unit_name,

            p.id AS program_id,
            p.name AS program_name,
            p.code AS program_code,

            e.id AS enrollment_id,
            e.student_number,
            e.year_of_study,
            e.enrollment_status

          FROM lms_assignments a

          INNER JOIN lms_lessons l
            ON l.id = a.lesson_id

          INNER JOIN lms_topics t
            ON t.id = l.topic_id

          INNER JOIN lms_units u
            ON u.id = t.unit_id

          INNER JOIN lms_programs p
            ON p.id = u.program_id

          INNER JOIN lms_enrollments e
            ON e.program_id = p.id

          WHERE a.id = $1

            AND e.application_id = $2

            AND (
              e.enrollment_status IS NULL
              OR LOWER(
                e.enrollment_status::text
              ) NOT IN (
                'cancelled',
                'dropped'
              )
            )

            AND LOWER(
              COALESCE(
                t.status::text,
                'active'
              )
            ) = 'active'

            AND LOWER(
              COALESCE(
                l.status::text,
                'active'
              )
            ) = 'active'

            AND LOWER(
              COALESCE(
                a.status::text,
                'active'
              )
            ) = 'active'

          ORDER BY
            e.enrolled_at DESC NULLS LAST,
            e.id DESC

          LIMIT 1
        `,
        [
          assignmentId,
          applicationId,
        ]
      );

    /* =======================================================
       NOT FOUND / NOT AUTHORIZED
    ======================================================= */

    if (
      assignmentResult.rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Assignment not found or you are not authorized to access it.',
        },
        { status: 404 }
      );
    }

    const assignment =
      assignmentResult.rows[0];

    /* =======================================================
       QUESTIONS
    ======================================================= */

    const questionsResult =
      await pool.query(
        `
          SELECT
            id,
            question_number,
            question,
            marks

          FROM lms_assignment_questions

          WHERE assignment_id = $1

          ORDER BY
            question_number ASC,
            id ASC
        `,
        [assignmentId]
      );

    /* =======================================================
       REQUIREMENTS
    ======================================================= */

    const requirementsResult =
      await pool.query(
        `
          SELECT
            id,
            requirement_number,
            requirement

          FROM lms_assignment_requirements

          WHERE assignment_id = $1

          ORDER BY
            requirement_number ASC,
            id ASC
        `,
        [assignmentId]
      );

    /* =======================================================
       DATE INFORMATION
    ======================================================= */

    const now = new Date();

    let dueDate: string | null = null;
    let isOverdue = false;
    let daysRemaining: number | null = null;

    if (assignment.due_date) {
      const due =
        new Date(
          assignment.due_date
        );

      dueDate =
        due.toISOString();

      isOverdue =
        due.getTime() <
        now.getTime();

      if (!isOverdue) {
        daysRemaining =
          Math.ceil(
            (
              due.getTime() -
              now.getTime()
            ) /
              (1000 *
                60 *
                60 *
                24)
          );
      }
    }

    /* =======================================================
       QUESTIONS
    ======================================================= */

    const questions =
      questionsResult.rows.map(
        (question) => ({
          id:
            Number(
              question.id
            ),

          questionNumber:
            Number(
              question.question_number
            ),

          question:
            question.question || '',

          marks:
            Number(
              question.marks || 0
            ),
        })
      );

    /* =======================================================
       REQUIREMENTS
    ======================================================= */

    const requirements =
      requirementsResult.rows.map(
        (requirement) => ({
          id:
            Number(
              requirement.id
            ),

          requirementNumber:
            Number(
              requirement.requirement_number
            ),

          requirement:
            requirement.requirement ||
            '',
        })
      );

    /* =======================================================
       RESPONSE
    ======================================================= */

    return NextResponse.json(
      {
        success: true,

        student: {
          applicationId,

          name: 'Student',

          applicationNumber:
            session.applicationNumber ||
            null,
        },

        program: {
          id:
            Number(
              assignment.program_id
            ),

          name:
            assignment.program_name,

          code:
            assignment.program_code ||
            null,

          enrollmentId:
            Number(
              assignment.enrollment_id
            ),

          studentNumber:
            assignment.student_number ||
            null,

          yearOfStudy:
            assignment.year_of_study !== null
              ? Number(
                  assignment.year_of_study
                )
              : null,

          enrollmentStatus:
            assignment.enrollment_status ||
            'active',
        },

        assignment: {
          id:
            Number(
              assignment.id
            ),

          lessonId:
            Number(
              assignment.lesson_id
            ),

          title:
            assignment.title,

          description:
            assignment.description ||
            null,

          dueDate,

          status:
            assignment.status ||
            'active',

          totalMarks:
            Number(
              assignment.total_marks ||
              0
            ),

          createdAt:
            assignment.created_at ||
            null,

          updatedAt:
            assignment.updated_at ||
            null,

          lesson: {
            id:
              Number(
                assignment.lesson_id
              ),

            title:
              assignment.lesson_title ||
              'Lesson',
          },

          topic: {
            id:
              Number(
                assignment.topic_id
              ),

            title:
              assignment.topic_title ||
              'Topic',
          },

          unit: {
            id:
              Number(
                assignment.unit_id
              ),

            name:
              assignment.unit_name ||
              'Unit',
          },

          questions,

          requirements,

          questionCount:
            questions.length,

          requirementCount:
            requirements.length,

          isOverdue,

          daysRemaining,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      'STUDENT ASSIGNMENT DETAILS API ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to load the assignment.',
      },
      { status: 500 }
    );
  }
}