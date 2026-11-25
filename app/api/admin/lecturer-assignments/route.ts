import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AssignmentAction =
  | 'assign-program'
  | 'remove-program'
  | 'assign-unit'
  | 'remove-unit'
  | 'assign-student-unit'
  | 'remove-student-unit';

function positiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

export async function GET() {
  try {
    const [lecturers, programs, units, lecturerPrograms, lecturerUnits, students, studentAssignments] = await Promise.all([
      pool.query(`
        SELECT id, name, email, phone, active
        FROM users
        WHERE LOWER(role) = 'lecturer'
          AND COALESCE(active, TRUE) = TRUE
        ORDER BY LOWER(COALESCE(name, '')) ASC
      `),
      pool.query(`
        SELECT id, name, code, status
        FROM lms_programs
        ORDER BY LOWER(name) ASC
      `),
      pool.query(`
        SELECT
          u.id,
          u.program_id,
          u.code,
          u.name,
          u.description,
          u.credit_hours,
          u.year_of_study,
          u.term_number,
          u.status,
          p.name AS program_name,
          p.code AS program_code
        FROM lms_units u
        INNER JOIN lms_programs p ON p.id = u.program_id
        ORDER BY LOWER(p.name), u.year_of_study NULLS LAST, u.term_number NULLS LAST, LOWER(u.name)
      `),
      pool.query(`
        SELECT
          lp.id,
          lp.lecturer_id,
          lp.program_id,
          lp.assigned_at,
          lp.updated_at,
          u.name AS lecturer_name,
          u.email AS lecturer_email,
          p.name AS program_name,
          p.code AS program_code
        FROM lms_lecturer_programs lp
        INNER JOIN users u ON u.id = lp.lecturer_id
        INNER JOIN lms_programs p ON p.id = lp.program_id
        ORDER BY LOWER(COALESCE(u.name, '')), LOWER(p.name)
      `),
      pool.query(`
        SELECT
          lu.id,
          lu.lecturer_id,
          lu.unit_id,
          lu.program_id,
          lu.assigned_at,
          u.name AS lecturer_name,
          u.email AS lecturer_email,
          unit.name AS unit_name,
          unit.code AS unit_code,
          p.name AS program_name
        FROM lms_lecturer_units lu
        INNER JOIN users u ON u.id = lu.lecturer_id
        INNER JOIN lms_units unit ON unit.id = lu.unit_id
        INNER JOIN lms_programs p ON p.id = lu.program_id
        ORDER BY LOWER(COALESCE(u.name, '')), LOWER(p.name), LOWER(unit.name)
      `),
      pool.query(`
        SELECT
          e.application_id,
          e.program_id,
          e.student_number,
          e.year_of_study,
          e.enrollment_status,
          e.enrolled_at,
          p.name AS program_name,
          p.code AS program_code,
          a.application_number,
          a.admission_number,
          a.first_name,
          a.middle_name,
          a.surname,
          TRIM(CONCAT_WS(' ', a.first_name, a.middle_name, a.surname)) AS full_name,
          a.email,
          a.mobile,
          a.intake
        FROM lms_enrollments e
        INNER JOIN applications a ON a.id = e.application_id
        LEFT JOIN lms_programs p ON p.id = e.program_id
        WHERE LOWER(COALESCE(e.enrollment_status, '')) = 'active'
          AND LOWER(COALESCE(a.application_status, '')) IN ('approved', 'accepted')
        ORDER BY LOWER(TRIM(CONCAT_WS(' ', a.first_name, a.middle_name, a.surname)))
      `),
      pool.query(`
        SELECT
          lsu.id,
          lsu.lecturer_id,
          lsu.application_id,
          lsu.unit_id,
          lsu.program_id,
          lsu.assigned_at,
          u.name AS lecturer_name,
          a.application_number,
          a.admission_number,
          TRIM(CONCAT_WS(' ', a.first_name, a.middle_name, a.surname)) AS student_name,
          a.email AS student_email,
          p.name AS student_program_name,
          unit.name AS unit_name,
          unit.code AS unit_code,
          unit_program.name AS unit_program_name
        FROM lms_lecturer_student_units lsu
        INNER JOIN users u ON u.id = lsu.lecturer_id
        INNER JOIN applications a ON a.id = lsu.application_id
        INNER JOIN lms_units unit ON unit.id = lsu.unit_id
        INNER JOIN lms_programs unit_program ON unit_program.id = lsu.program_id
        LEFT JOIN lms_enrollments e ON e.application_id = lsu.application_id
          AND e.enrollment_status = 'active'
        LEFT JOIN lms_programs p ON p.id = e.program_id
        ORDER BY LOWER(COALESCE(u.name, '')), LOWER(TRIM(CONCAT_WS(' ', a.first_name, a.middle_name, a.surname))), LOWER(unit.name)
      `),
    ]);

    // Legacy programme-level student assignments are retained and shown alongside unit assignments.
    const legacyAssignments = await pool.query(`
      SELECT
        ls.id,
        ls.lecturer_id,
        ls.application_id,
        ls.program_id,
        ls.assigned_at,
        u.name AS lecturer_name,
        a.application_number,
        a.admission_number,
        TRIM(CONCAT_WS(' ', a.first_name, a.middle_name, a.surname)) AS student_name,
        a.email AS student_email,
        p.name AS assigned_program_name
      FROM lms_lecturer_students ls
      INNER JOIN users u ON u.id = ls.lecturer_id
      INNER JOIN applications a ON a.id = ls.application_id
      LEFT JOIN lms_programs p ON p.id = ls.program_id
      ORDER BY LOWER(COALESCE(u.name, '')), LOWER(TRIM(CONCAT_WS(' ', a.first_name, a.middle_name, a.surname)))
    `);

    return NextResponse.json({
      success: true,
      lecturers: lecturers.rows,
      programs: programs.rows,
      units: units.rows,
      lecturerPrograms: lecturerPrograms.rows,
      lecturerUnits: lecturerUnits.rows,
      students: students.rows,
      studentAssignments: studentAssignments.rows,
      legacyStudentAssignments: legacyAssignments.rows,
    });
  } catch (error) {
    console.error('GET /api/admin/lecturer-assignments:', error);
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const action = String(body.action || '') as AssignmentAction;
    const lecturerId = positiveId(body.lecturerId);
    const programId = positiveId(body.programId);
    const unitId = positiveId(body.unitId);
    const applicationId = positiveId(body.applicationId);

    if (!lecturerId) {
      return NextResponse.json({ success: false, error: 'Select a valid lecturer.' }, { status: 400 });
    }

    await client.query('BEGIN');

    const lecturer = await client.query(
      `SELECT id, name FROM users WHERE id = $1 AND LOWER(role) = 'lecturer' AND COALESCE(active, TRUE) = TRUE LIMIT 1`,
      [lecturerId],
    );
    if (!lecturer.rowCount) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Lecturer not found or inactive.' }, { status: 404 });
    }

    if (action === 'assign-program' || action === 'remove-program') {
      if (!programId) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Select a valid programme.' }, { status: 400 });
      }
      const program = await client.query('SELECT id FROM lms_programs WHERE id = $1', [programId]);
      if (!program.rowCount) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Programme not found.' }, { status: 404 });
      }
      if (action === 'assign-program') {
        const exists = await client.query('SELECT id FROM lms_lecturer_programs WHERE lecturer_id = $1 AND program_id = $2 LIMIT 1', [lecturerId, programId]);
        if (!exists.rowCount) {
          await client.query(`INSERT INTO lms_lecturer_programs (lecturer_id, program_id, assigned_at, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, [lecturerId, programId]);
        }
      } else {
        await client.query('DELETE FROM lms_lecturer_programs WHERE lecturer_id = $1 AND program_id = $2', [lecturerId, programId]);
      }
    } else if (action === 'assign-unit' || action === 'remove-unit') {
      if (!unitId) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Select a valid unit.' }, { status: 400 });
      }
      const unit = await client.query('SELECT id, program_id FROM lms_units WHERE id = $1', [unitId]);
      if (!unit.rowCount) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Unit not found.' }, { status: 404 });
      }
      const actualProgramId = Number(unit.rows[0].program_id);
      if (action === 'assign-unit') {
        const exists = await client.query('SELECT id FROM lms_lecturer_units WHERE lecturer_id = $1 AND unit_id = $2 LIMIT 1', [lecturerId, unitId]);
        if (!exists.rowCount) {
          await client.query(`INSERT INTO lms_lecturer_units (lecturer_id, unit_id, program_id, assigned_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`, [lecturerId, unitId, actualProgramId]);
        }
      } else {
        await client.query('DELETE FROM lms_lecturer_student_units WHERE lecturer_id = $1 AND unit_id = $2', [lecturerId, unitId]);
        await client.query('DELETE FROM lms_lecturer_units WHERE lecturer_id = $1 AND unit_id = $2', [lecturerId, unitId]);
      }
    } else if (action === 'assign-student-unit' || action === 'remove-student-unit') {
      if (!unitId || !applicationId) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Select both a student and a unit.' }, { status: 400 });
      }
      const [application, unit] = await Promise.all([
        client.query(`SELECT id, application_status FROM applications WHERE id = $1 LIMIT 1`, [applicationId]),
        client.query(`SELECT id, program_id FROM lms_units WHERE id = $1 LIMIT 1`, [unitId]),
      ]);
      if (!application.rowCount || !['approved', 'accepted'].includes(String(application.rows[0].application_status || '').trim().toLowerCase())) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Only approved students can be assigned.' }, { status: 400 });
      }
      if (!unit.rowCount) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Unit not found.' }, { status: 404 });
      }
      const actualProgramId = Number(unit.rows[0].program_id);
      if (action === 'assign-student-unit') {
        const lecturerAccess = await client.query(`
          SELECT 1
          FROM lms_lecturer_units
          WHERE lecturer_id = $1 AND unit_id = $2
          UNION
          SELECT 1
          FROM lms_lecturer_programs
          WHERE lecturer_id = $1 AND program_id = $3
          LIMIT 1
        `, [lecturerId, unitId, actualProgramId]);
        if (!lecturerAccess.rowCount) {
          await client.query('ROLLBACK');
          return NextResponse.json({ success: false, error: 'Assign this unit or its programme to the lecturer first.' }, { status: 400 });
        }
        const exists = await client.query('SELECT id FROM lms_lecturer_student_units WHERE lecturer_id = $1 AND application_id = $2 AND unit_id = $3 LIMIT 1', [lecturerId, applicationId, unitId]);
        if (!exists.rowCount) {
          await client.query(`INSERT INTO lms_lecturer_student_units (lecturer_id, application_id, unit_id, program_id, assigned_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`, [lecturerId, applicationId, unitId, actualProgramId]);
        }
      } else {
        await client.query('DELETE FROM lms_lecturer_student_units WHERE lecturer_id = $1 AND application_id = $2 AND unit_id = $3', [lecturerId, applicationId, unitId]);
      }
    } else {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Unknown assignment action.' }, { status: 400 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Lecturer assignment updated successfully.' });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* ignore rollback errors */ }
    console.error('POST /api/admin/lecturer-assignments:', error);
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  } finally {
    client.release();
  }
}
