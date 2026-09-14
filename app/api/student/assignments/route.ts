import { NextResponse } from 'next/server';

import pool from '@/lib/db';
import { getStudentSession } from '@/lib/student-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* =========================================================
   TYPES
========================================================= */

type AssignmentQuestion = {
  id: number;
  questionNumber: number;
  question: string;
  marks: number;
};

type AssignmentRequirement = {
  id: number;
  requirementNumber: number;
  requirement: string;
};

/* =========================================================
   GET /api/student/assignments
========================================================= */

export async function GET(request: Request) {
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

    const applicationId = Number(session.applicationId);

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
       OPTIONAL PROGRAM FILTER
       
       Example:
       /api/student/assignments?program_id=4
    ======================================================= */

    const url = new URL(request.url);

    const rawProgramId =
      url.searchParams.get('program_id');

    let requestedProgramId: number | null = null;

    if (rawProgramId) {
      const parsedProgramId = Number(rawProgramId);

      if (
        !Number.isInteger(parsedProgramId) ||
        parsedProgramId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message: 'Invalid program ID.',
          },
          { status: 400 }
        );
      }

      requestedProgramId = parsedProgramId;
    }

    /* =======================================================
       FIND STUDENT ENROLLMENT
       
       IMPORTANT:
       The student's application_id is the authorization
       boundary.

       We never trust program_id by itself.
    ======================================================= */

    let enrollmentResult;

    if (requestedProgramId !== null) {
      enrollmentResult = await pool.query(
        `
          SELECT
            e.id AS enrollment_id,
            e.application_id,
            e.program_id,

            e.student_number,
            e.year_of_study,
            e.enrollment_status,
            e.enrolled_at,

            p.name AS program_name,
            p.code AS program_code,
            p.description AS program_description,
            p.duration,
            p.level,
            p.status AS program_status

          FROM lms_enrollments e

          INNER JOIN lms_programs p
            ON p.id = e.program_id

          WHERE e.application_id = $1
            AND e.program_id = $2

            AND (
              e.enrollment_status IS NULL
              OR LOWER(
                e.enrollment_status::text
              ) NOT IN (
                'cancelled',
                'dropped'
              )
            )

          ORDER BY
            e.enrolled_at DESC NULLS LAST,
            e.id DESC

          LIMIT 1
        `,
        [
          applicationId,
          requestedProgramId,
        ]
      );

      /*
       * If requested program is not part of the student's
       * enrollment, do NOT use it.
       *
       * Fall back to latest valid enrollment.
       */

      if (enrollmentResult.rows.length === 0) {
        enrollmentResult = await pool.query(
          `
            SELECT
              e.id AS enrollment_id,
              e.application_id,
              e.program_id,

              e.student_number,
              e.year_of_study,
              e.enrollment_status,
              e.enrolled_at,

              p.name AS program_name,
              p.code AS program_code,
              p.description AS program_description,
              p.duration,
              p.level,
              p.status AS program_status

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

            ORDER BY
              e.enrolled_at DESC NULLS LAST,
              e.id DESC

            LIMIT 1
          `,
          [applicationId]
        );
      }
    } else {
      /* =====================================================
         NO PROGRAM FILTER
         
         Use latest valid enrollment.
      ===================================================== */

      enrollmentResult = await pool.query(
        `
          SELECT
            e.id AS enrollment_id,
            e.application_id,
            e.program_id,

            e.student_number,
            e.year_of_study,
            e.enrollment_status,
            e.enrolled_at,

            p.name AS program_name,
            p.code AS program_code,
            p.description AS program_description,
            p.duration,
            p.level,
            p.status AS program_status

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

          ORDER BY
            e.enrolled_at DESC NULLS LAST,
            e.id DESC

          LIMIT 1
        `,
        [applicationId]
      );
    }

    /* =======================================================
       NO ENROLLMENT
    ======================================================= */

    if (enrollmentResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: true,

          student: {
            applicationId,
            applicationNumber:
              session.applicationNumber || null,
            name: 'Student',
          },

          program: null,

          assignments: [],

          totals: {
            assignments: 0,
            active: 0,
            overdue: 0,
            totalMarks: 0,
          },
        },
        { status: 200 }
      );
    }

    const enrollment = enrollmentResult.rows[0];

    const enrollmentId =
      Number(enrollment.enrollment_id);

    const selectedProgramId =
      Number(enrollment.program_id);

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
        const student =
          studentResult.rows[0];

        studentName =
          student.student_name?.trim() ||
          'Student';

        applicationNumber =
          student.application_number ||
          applicationNumber ||
          null;

        admissionNumber =
          student.admission_number ||
          null;
      }
    } catch (error) {
      console.error(
        'STUDENT ASSIGNMENTS - STUDENT INFO ERROR:',
        error
      );
    }

    /* =======================================================
       GET ASSIGNMENTS
       
       Authorization:
       assignment → lesson → topic → unit → student's program

       Only active lessons/topics are visible.

       Draft/inactive assignments are hidden.
    ======================================================= */

    const assignmentsResult = await pool.query(
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
          p.code AS program_code

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

        WHERE e.id = $1

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
          CASE
            WHEN a.due_date IS NULL THEN 1
            ELSE 0
          END,

          a.due_date ASC,

          a.created_at DESC,
          a.id DESC
      `,
      [enrollmentId]
    );

    /* =======================================================
       GET QUESTIONS
    ======================================================= */

    const questionsResult = await pool.query(
      `
        SELECT
          q.id,
          q.assignment_id,
          q.question_number,
          q.question,
          q.marks

        FROM lms_assignment_questions q

        INNER JOIN lms_assignments a
          ON a.id = q.assignment_id

        INNER JOIN lms_lessons l
          ON l.id = a.lesson_id

        INNER JOIN lms_topics t
          ON t.id = l.topic_id

        INNER JOIN lms_units u
          ON u.id = t.unit_id

        WHERE u.program_id = $1

        ORDER BY
          q.assignment_id ASC,
          q.question_number ASC,
          q.id ASC
      `,
      [selectedProgramId]
    );

    /* =======================================================
       GET REQUIREMENTS
    ======================================================= */

    const requirementsResult = await pool.query(
      `
        SELECT
          r.id,
          r.assignment_id,
          r.requirement,
          r.requirement_number

        FROM lms_assignment_requirements r

        INNER JOIN lms_assignments a
          ON a.id = r.assignment_id

        INNER JOIN lms_lessons l
          ON l.id = a.lesson_id

        INNER JOIN lms_topics t
          ON t.id = l.topic_id

        INNER JOIN lms_units u
          ON u.id = t.unit_id

        WHERE u.program_id = $1

        ORDER BY
          r.assignment_id ASC,
          r.requirement_number ASC,
          r.id ASC
      `,
      [selectedProgramId]
    );

    /* =======================================================
       BUILD LOOKUP MAPS
    ======================================================= */

    const questionsByAssignment =
      new Map<number, AssignmentQuestion[]>();

    for (const row of questionsResult.rows) {
      const assignmentId =
        Number(row.assignment_id);

      if (
        !questionsByAssignment.has(
          assignmentId
        )
      ) {
        questionsByAssignment.set(
          assignmentId,
          []
        );
      }

      questionsByAssignment
        .get(assignmentId)!
        .push({
          id: Number(row.id),

          questionNumber:
            Number(
              row.question_number
            ),

          question:
            row.question || '',

          marks:
            Number(row.marks || 0),
        });
    }

    const requirementsByAssignment =
      new Map<
        number,
        AssignmentRequirement[]
      >();

    for (
      const row
      of requirementsResult.rows
    ) {
      const assignmentId =
        Number(row.assignment_id);

      if (
        !requirementsByAssignment.has(
          assignmentId
        )
      ) {
        requirementsByAssignment.set(
          assignmentId,
          []
        );
      }

      requirementsByAssignment
        .get(assignmentId)!
        .push({
          id: Number(row.id),

          requirementNumber:
            Number(
              row.requirement_number
            ),

          requirement:
            row.requirement || '',
        });
    }

    /* =======================================================
       BUILD ASSIGNMENTS
    ======================================================= */

    const now = new Date();

    const assignments =
      assignmentsResult.rows.map(
        (assignment) => {
          const assignmentId =
            Number(assignment.id);

          const questions =
            questionsByAssignment.get(
              assignmentId
            ) || [];

          const requirements =
            requirementsByAssignment.get(
              assignmentId
            ) || [];

          let dueDate: string | null =
            null;

          let isOverdue = false;

          let daysRemaining: number | null =
            null;

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
              const difference =
                due.getTime() -
                now.getTime();

              daysRemaining =
                Math.ceil(
                  difference /
                    (1000 *
                      60 *
                      60 *
                      24)
                );
            }
          }

          return {
            id: assignmentId,

            lessonId:
              Number(
                assignment.lesson_id
              ),

            title:
              assignment.title ||
              'Untitled Assignment',

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
                'Untitled Lesson',
            },

            topic: {
              id:
                Number(
                  assignment.topic_id
                ),

              title:
                assignment.topic_title ||
                'Untitled Topic',
            },

            unit: {
              id:
                Number(
                  assignment.unit_id
                ),

              name:
                assignment.unit_name ||
                'Untitled Unit',
            },

            program: {
              id:
                Number(
                  assignment.program_id
                ),

              name:
                assignment.program_name ||
                'Program',

              code:
                assignment.program_code ||
                null,
            },

            questions,

            requirements,

            questionCount:
              questions.length,

            requirementCount:
              requirements.length,

            isOverdue,

            daysRemaining,
          };
        }
      );

    /* =======================================================
       TOTALS
    ======================================================= */

    const totalAssignments =
      assignments.length;

    const activeAssignments =
      assignments.filter(
        (assignment) =>
          !assignment.isOverdue
      ).length;

    const overdueAssignments =
      assignments.filter(
        (assignment) =>
          assignment.isOverdue
      ).length;

    const totalMarks =
      assignments.reduce(
        (total, assignment) =>
          total +
          assignment.totalMarks,
        0
      );

    /* =======================================================
       RESPONSE
    ======================================================= */

    return NextResponse.json(
      {
        success: true,

        student: {
          applicationId,

          name:
            studentName,

          applicationNumber,

          admissionNumber,
        },

        program: {
          id:
            selectedProgramId,

          name:
            enrollment.program_name,

          code:
            enrollment.program_code ||
            null,

          description:
            enrollment.program_description ||
            null,

          duration:
            enrollment.duration ||
            null,

          level:
            enrollment.level ||
            null,

          status:
            enrollment.program_status ||
            null,

          enrollmentId,

          studentNumber:
            enrollment.student_number ||
            null,

          yearOfStudy:
            enrollment.year_of_study !== null
              ? Number(
                  enrollment.year_of_study
                )
              : null,

          enrollmentStatus:
            enrollment.enrollment_status ||
            'active',
        },

        assignments,

        totals: {
          assignments:
            totalAssignments,

          active:
            activeAssignments,

          overdue:
            overdueAssignments,

          totalMarks,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      'STUDENT ASSIGNMENTS API ERROR:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          'Unable to load your assignments at the moment.',
      },
      { status: 500 }
    );
  }
}