import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const runtime = 'nodejs';

/* =========================================================
   ADMIN - ASSIGN STUDENTS

   GET
   /api/admin/assign-students

   Returns:
   - approved students
   - LMS programs
   - lecturers with authorized LMS programs
   - lecturer/program authorizations
   - current LMS enrollments
   - current lecturer assignments

   POST
   /api/admin/assign-students

   Creates/updates:
   - LMS enrollment
   - lecturer assignment

   DELETE
   /api/admin/assign-students

   Removes:
   - lecturer assignment
   - LMS enrollment
========================================================= */

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

/* =========================================================
   GET
========================================================= */

export async function GET() {
  const client = await pool.connect();

  try {
    /* =====================================================
       1. APPROVED STUDENTS
    ===================================================== */

    const studentsResult = await client.query(`
      SELECT
        a.id,
        a.id AS application_id,

        a.application_number,
        a.admission_number,

        a.first_name,
        a.middle_name,
        a.surname,

        TRIM(
          CONCAT_WS(
            ' ',
            a.first_name,
            a.middle_name,
            a.surname
          )
        ) AS full_name,

        a.email,
        a.mobile,

        a.course,
        a.intake,

        a.application_status,
        a.payment_status,

        a.created_at,
        a.approved_at

      FROM applications a

      WHERE LOWER(TRIM(a.application_status)) IN (
        'approved',
        'accepted'
      )

      ORDER BY
        LOWER(
          TRIM(
            CONCAT_WS(
              ' ',
              a.first_name,
              a.middle_name,
              a.surname
            )
          )
        ) ASC
    `);

    /* =====================================================
       2. LMS PROGRAMS
    ===================================================== */

    const programsResult = await client.query(`
      SELECT
        id,
        name

      FROM lms_programs

      ORDER BY
        LOWER(name) ASC
    `);

    /* =====================================================
       2B. LMS UNITS
       Admin may assign a lecturer to a unit from any program.
    ===================================================== */

    const unitsResult = await client.query(`
      SELECT
        u.id,
        u.program_id,
        u.code,
        u.name,
        p.name AS program_name
      FROM lms_units u
      INNER JOIN lms_programs p ON p.id = u.program_id
      ORDER BY LOWER(p.name) ASC, LOWER(u.name) ASC
    `);

    /* =====================================================
       3. LECTURERS

       Only lecturers who have at least one authorized
       LMS program.

       GROUP BY is intentionally used instead of DISTINCT
       so PostgreSQL does not produce the previous
       transformDistinctClause error.
    ===================================================== */

    const lecturersResult = await client.query(`
      SELECT
        u.id,
        u.name,
        u.email

      FROM users u

      WHERE u.role = 'lecturer'
        AND u.active = TRUE

      GROUP BY
        u.id,
        u.name,
        u.email

      ORDER BY
        LOWER(COALESCE(u.name, '')) ASC
    `);

    /* =====================================================
       4. LECTURER-PROGRAM AUTHORIZATIONS
    ===================================================== */

    const lecturerProgramsResult = await client.query(`
      SELECT
        lp.id,
        lp.lecturer_id,
        lp.program_id,
        lp.assigned_at,
        lp.updated_at,

        u.name AS lecturer_name,
        u.email AS lecturer_email,

        p.name AS program_name

      FROM lms_lecturer_programs lp

      INNER JOIN users u
        ON u.id = lp.lecturer_id

      INNER JOIN lms_programs p
        ON p.id = lp.program_id

      ORDER BY
        LOWER(COALESCE(u.name, '')) ASC,
        LOWER(COALESCE(p.name, '')) ASC
    `);

    /* =====================================================
       5. LMS ENROLLMENTS

       IMPORTANT:

       The frontend expects:

         status

       Therefore enrollment_status is returned as:

         status

       We ALSO return enrollment_status for compatibility.

       This is important because your database currently
       contains:

         application_id = 5
         program_id = 49
         program_name = German Language
         enrollment_status = active
         lecturer_id = 1

       So the frontend will correctly recognize it.
    ===================================================== */

    const enrollmentsResult = await client.query(`
      SELECT
        e.id,

        e.application_id,

        e.program_id,

        e.term_id,

        e.student_number,

        e.year_of_study,

        e.enrollment_status AS status,
        e.enrollment_status,

        e.enrolled_at,
        e.completed_at,

        e.lecturer_id,

        p.name AS program_name,

        u.name AS lecturer_name,
        u.email AS lecturer_email

      FROM lms_enrollments e

      LEFT JOIN lms_programs p
        ON p.id = e.program_id

      LEFT JOIN users u
        ON u.id = e.lecturer_id

      ORDER BY
        e.id DESC
    `);

    /* =====================================================
       6. LECTURER-STUDENT ASSIGNMENTS
    ===================================================== */

    const lecturerStudentsResult = await client.query(`
      SELECT
        ls.id,

        ls.lecturer_id,
        ls.application_id,
        ls.program_id,
        ls.unit_id,

        ls.assigned_at,
        ls.updated_at,

        u.name AS lecturer_name,
        u.email AS lecturer_email,

        p.name AS program_name,
        unit.name AS unit_name,
        unit.program_id AS unit_program_id,
        unit_program.name AS unit_program_name,

        TRIM(
          CONCAT_WS(
            ' ',
            a.first_name,
            a.middle_name,
            a.surname
          )
        ) AS student_name,

        a.email AS student_email

      FROM lms_lecturer_students ls

      LEFT JOIN users u
        ON u.id = ls.lecturer_id

      LEFT JOIN lms_programs p
        ON p.id = ls.program_id

      LEFT JOIN lms_units unit
        ON unit.id = ls.unit_id

      LEFT JOIN lms_programs unit_program
        ON unit_program.id = unit.program_id

      LEFT JOIN applications a
        ON a.id = ls.application_id

      ORDER BY
        ls.id DESC
    `);

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      students: studentsResult.rows,

      programs: programsResult.rows,
      units: unitsResult.rows,

      lecturers: lecturersResult.rows,

      lecturerPrograms:
        lecturerProgramsResult.rows,

      enrollments:
        enrollmentsResult.rows,

      lecturerAssignments:
        lecturerStudentsResult.rows,
    });
  } catch (error) {
    console.error(
      'GET /api/admin/assign-students:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      {
        status: 500,
      }
    );
  } finally {
    client.release();
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(request: Request) {
  const client = await pool.connect();

  try {
    const body = await request.json();

    /* =====================================================
       ACCEPT applicationId

       Also accept studentId for backwards compatibility.
    ===================================================== */

    const applicationId = Number(
      body.applicationId ??
        body.studentId
    );

    const programId = Number(
      body.programId
    );

    const assignmentType =
      body.assignmentType === 'unit' ? 'unit' : 'program';

    const unitId =
      body.unitId === null || body.unitId === undefined || body.unitId === ''
        ? null
        : Number(body.unitId);

    const lecturerId =
      body.lecturerId === null ||
      body.lecturerId === undefined ||
      body.lecturerId === ''
        ? null
        : Number(body.lecturerId);

    const termId =
      body.termId === null ||
      body.termId === undefined ||
      body.termId === ''
        ? null
        : Number(body.termId);

    const yearOfStudy =
      body.yearOfStudy === null ||
      body.yearOfStudy === undefined ||
      body.yearOfStudy === ''
        ? null
        : Number(body.yearOfStudy);

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A valid student application is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(programId) ||
      programId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A valid LMS program is required.',
        },
        {
          status: 400,
        }
      );
    }

    if (assignmentType === 'unit' && (
      unitId === null || !Number.isInteger(unitId) || unitId <= 0
    )) {
      return NextResponse.json(
        { success: false, error: 'A valid unit is required for a unit-level assignment.' },
        { status: 400 }
      );
    }

    if (assignmentType === 'unit' && lecturerId === null) {
      return NextResponse.json(
        { success: false, error: 'A lecturer is required for a unit-level assignment.' },
        { status: 400 }
      );
    }

    if (
      lecturerId !== null &&
      (
        !Number.isInteger(lecturerId) ||
        lecturerId <= 0
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid lecturer.',
        },
        {
          status: 400,
        }
      );
    }

    await client.query('BEGIN');

    /* =====================================================
       1. VERIFY APPLICATION
    ===================================================== */

    const applicationResult =
      await client.query(
        `
          SELECT
            id,
            application_number,
            admission_number,
            first_name,
            middle_name,
            surname,
            email,
            course,
            intake,
            application_status

          FROM applications

          WHERE id = $1

          LIMIT 1
        `,
        [applicationId]
      );

    if (
      applicationResult.rowCount === 0
    ) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error:
            'Student application not found.',
        },
        {
          status: 404,
        }
      );
    }

    const application =
      applicationResult.rows[0];

    /* =====================================================
       2. ONLY APPROVED STUDENTS
    ===================================================== */

    const status = String(
      application.application_status || ''
    )
      .trim()
      .toLowerCase();

    if (
      status !== 'approved' &&
      status !== 'accepted'
    ) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error:
            'Only approved students can be assigned to the LMS.',
        },
        {
          status: 400,
        }
      );
    }

    /* =====================================================
       3. VERIFY LMS PROGRAM
    ===================================================== */

    const programResult =
      await client.query(
        `
          SELECT
            id,
            name

          FROM lms_programs

          WHERE id = $1

          LIMIT 1
        `,
        [programId]
      );

    if (
      programResult.rowCount === 0
    ) {
      await client.query('ROLLBACK');

      return NextResponse.json(
        {
          success: false,
          error:
            'LMS program not found.',
        },
        {
          status: 404,
        }
      );
    }

    const program =
      programResult.rows[0];

    /* =====================================================
       4. VERIFY LECTURER + AUTHORIZATION
    ===================================================== */

    let lecturer: {
      id: number;
      name: string;
      email: string;
    } | null = null;

    if (lecturerId !== null) {
      const lecturerResult =
        await client.query(
          `
            SELECT
              id,
              name,
              email

            FROM users

            WHERE id = $1

            LIMIT 1
          `,
          [lecturerId]
        );

      if (
        lecturerResult.rowCount === 0
      ) {
        await client.query('ROLLBACK');

        return NextResponse.json(
          {
            success: false,
            error: 'Lecturer not found.',
          },
          {
            status: 404,
          }
        );
      }

      lecturer =
        lecturerResult.rows[0];

      if (assignmentType === 'program') {
        const authorizationResult = await client.query(
          `SELECT id FROM lms_lecturer_programs
           WHERE lecturer_id = $1 AND program_id = $2 LIMIT 1`,
          [lecturerId, programId]
        );

        if (authorizationResult.rowCount === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'The selected lecturer is not authorized for this program. Assign the lecturer to the unit instead, or authorize the programme first.' },
            { status: 400 }
          );
        }
      } else {
        const unitResult = await client.query(
          `SELECT id, program_id, name FROM lms_units WHERE id = $1 LIMIT 1`,
          [unitId]
        );
        if (unitResult.rowCount === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'The selected unit was not found.' },
            { status: 404 }
          );
        }
        await client.query(
          `INSERT INTO lms_lecturer_units (lecturer_id, unit_id, direct_access)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (lecturer_id, unit_id)
           DO UPDATE SET direct_access = TRUE, updated_at = CURRENT_TIMESTAMP`,
          [lecturerId, unitId]
        );
      }
    }

    /* =====================================================
       5. STUDENT NUMBER
    ===================================================== */

    const studentNumber =
      application.admission_number ||
      application.application_number ||
      `LMS-${application.id}`;

    /* =====================================================
       6. CHECK EXISTING LMS ENROLLMENT
    ===================================================== */

    const existingEnrollment =
      await client.query(
        `
          SELECT
            id

          FROM lms_enrollments

          WHERE application_id = $1

          ORDER BY id DESC

          LIMIT 1
        `,
        [applicationId]
      );

    let enrollmentId: number;

    if (assignmentType === 'unit' && existingEnrollment.rowCount && existingEnrollment.rowCount > 0) {
      const currentEnrollment = await client.query(
        `SELECT program_id FROM lms_enrollments WHERE id = $1 LIMIT 1`,
        [existingEnrollment.rows[0].id]
      );
      if (Number(currentEnrollment.rows[0]?.program_id) !== programId) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'For a unit-level assignment, select the student’s existing LMS programme. Unit assignment must not change the student’s programme enrolment.' },
          { status: 400 }
        );
      }
    }

    /* =====================================================
       7. UPDATE EXISTING ENROLLMENT
    ===================================================== */

    if (
      existingEnrollment.rowCount &&
      existingEnrollment.rowCount > 0
    ) {
      enrollmentId =
        existingEnrollment.rows[0].id;

      await client.query(
        `
          UPDATE lms_enrollments

          SET
            program_id = $1,

            term_id = $2,

            student_number = $3,

            year_of_study =
              COALESCE(
                $4,
                year_of_study
              ),

            enrollment_status = 'active',

            lecturer_id = CASE WHEN $5::boolean THEN $6 ELSE lecturer_id END,

            updated_at = CURRENT_TIMESTAMP

          WHERE id = $7
        `,
        [
          programId,
          termId,
          studentNumber,
          yearOfStudy,
          assignmentType === 'program',
          lecturerId,
          enrollmentId,
        ]
      );
    }

    /* =====================================================
       8. CREATE NEW ENROLLMENT
    ===================================================== */

    else {
      const enrollmentInsert =
        await client.query(
          `
            INSERT INTO lms_enrollments (
              application_id,
              program_id,
              term_id,
              student_number,
              year_of_study,
              enrollment_status,
              enrolled_at,
              created_at,
              updated_at,
              lecturer_id
            )

            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              'active',
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP,
              $6
            )

            RETURNING id
          `,
          [
            applicationId,
            programId,
            termId,
            studentNumber,
            yearOfStudy,
            assignmentType === 'program' ? lecturerId : null,
          ]
        );

      enrollmentId =
        enrollmentInsert.rows[0].id;
    }

    /* =====================================================
       9. LECTURER-STUDENT ASSIGNMENT

       Do not delete other lecturer assignments. A student may
       have several lecturers and several unit-specific assignments.
    ===================================================== */

    if (lecturerId !== null) {
      const assignedUnitId = assignmentType === 'unit' ? unitId : null;
      const existingAssignment = await client.query(
        `SELECT id FROM lms_lecturer_students
         WHERE lecturer_id = $1
           AND application_id = $2
           AND program_id = $3
           AND unit_id IS NOT DISTINCT FROM $4::integer
         LIMIT 1`,
        [lecturerId, applicationId, programId, assignedUnitId]
      );

      if (existingAssignment.rowCount === 0) {
        await client.query(
          `INSERT INTO lms_lecturer_students (
             lecturer_id, application_id, program_id, unit_id,
             assigned_at, updated_at
           ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [lecturerId, applicationId, programId, assignedUnitId]
        );
      }
    }

    /* =====================================================
       10. COMMIT
    ===================================================== */

    await client.query('COMMIT');

    /* =====================================================
       SUCCESS RESPONSE
    ===================================================== */

    return NextResponse.json({
      success: true,

      message:
        lecturerId !== null
          ? `Student assigned to ${program.name} and ${lecturer?.name} successfully.`
          : `Student assigned to ${program.name} successfully.`,

      enrollmentId,

      applicationId,

      programId,

      programName: program.name,

      lecturerId,

      lecturerName:
        lecturer?.name || null,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors
    }

    console.error(
      'POST /api/admin/assign-students:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      {
        status: 500,
      }
    );
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE
========================================================= */

export async function DELETE(
  request: Request
) {
  const client = await pool.connect();

  try {
    const body = await request.json();

    const applicationId = Number(
      body.applicationId ??
        body.studentId
    );

    const type =
      body.type || 'lecturer';

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      !Number.isInteger(applicationId) ||
      applicationId <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'A valid student application is required.',
        },
        {
          status: 400,
        }
      );
    }

    await client.query('BEGIN');

    /* =====================================================
       REMOVE LECTURER
    ===================================================== */

    if (type === 'lecturer') {
      const lecturerId = body.lecturerId ? Number(body.lecturerId) : null;
      const unitId = body.unitId === null || body.unitId === undefined || body.unitId === '' ? null : Number(body.unitId);
      const programId = body.programId ? Number(body.programId) : null;
      const unitIdWasProvided = Object.prototype.hasOwnProperty.call(body, 'unitId');

      if (lecturerId && Number.isInteger(lecturerId)) {
        if (unitIdWasProvided && unitId === null) {
          await client.query(
            `DELETE FROM lms_lecturer_students
             WHERE application_id = $1 AND lecturer_id = $2
               AND unit_id IS NULL
               AND ($3::integer IS NULL OR program_id = $3)`,
            [applicationId, lecturerId, programId]
          );
        } else if (unitIdWasProvided && unitId !== null && Number.isInteger(unitId)) {
          await client.query(
            `DELETE FROM lms_lecturer_students
             WHERE application_id = $1 AND lecturer_id = $2
               AND unit_id = $3
               AND ($4::integer IS NULL OR program_id = $4)`,
            [applicationId, lecturerId, unitId, programId]
          );
        } else {
          await client.query(
            `DELETE FROM lms_lecturer_students WHERE application_id = $1 AND lecturer_id = $2`,
            [applicationId, lecturerId]
          );
        }
      } else {
        await client.query(
          `DELETE FROM lms_lecturer_students WHERE application_id = $1`,
          [applicationId]
        );
      }

      if (lecturerId && unitIdWasProvided && unitId !== null && Number.isInteger(unitId)) {
        await client.query(
          `UPDATE lms_lecturer_units lu
           SET direct_access = FALSE, updated_at = CURRENT_TIMESTAMP
           WHERE lu.lecturer_id = $1 AND lu.unit_id = $2
             AND NOT EXISTS (
               SELECT 1 FROM lms_lecturer_students ls
               WHERE ls.lecturer_id = $1 AND ls.unit_id = $2
             )`,
          [lecturerId, unitId]
        );
        await client.query(
          `DELETE FROM lms_lecturer_units
           WHERE lecturer_id = $1 AND unit_id = $2
             AND program_access = FALSE AND direct_access = FALSE`,
          [lecturerId, unitId]
        );
      }

      await client.query(
        `UPDATE lms_enrollments e
         SET lecturer_id = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE e.application_id = $1
           AND ($2::integer IS NULL OR e.lecturer_id = $2)
           AND NOT EXISTS (
             SELECT 1 FROM lms_lecturer_students ls
             WHERE ls.application_id = e.application_id
               AND ls.program_id = e.program_id
               AND ls.lecturer_id = e.lecturer_id
               AND ls.unit_id IS NULL
           )`,
        [applicationId, lecturerId]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,

        message:
          'Lecturer assignment removed successfully.',
      });
    }

    /* =====================================================
       REMOVE PROGRAM ENROLLMENT
    ===================================================== */

    if (type === 'program') {
      const programId = body.programId ? Number(body.programId) : null;
      if (programId && Number.isInteger(programId)) {
        await client.query(
          `DELETE FROM lms_lecturer_students WHERE application_id = $1 AND program_id = $2`,
          [applicationId, programId]
        );
        await client.query(
          `DELETE FROM lms_enrollments WHERE application_id = $1 AND program_id = $2`,
          [applicationId, programId]
        );
      } else {
        await client.query(`DELETE FROM lms_lecturer_students WHERE application_id = $1`, [applicationId]);
        await client.query(`DELETE FROM lms_enrollments WHERE application_id = $1`, [applicationId]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,

        message:
          'Student LMS enrollment removed successfully.',
      });
    }

    /* =====================================================
       INVALID DELETE TYPE
    ===================================================== */

    await client.query('ROLLBACK');

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid delete type.',
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors
    }

    console.error(
      'DELETE /api/admin/assign-students:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage(error),
      },
      {
        status: 500,
      }
    );
  } finally {
    client.release();
  }
}