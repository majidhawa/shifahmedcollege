import { cache } from 'react';

import pool from '@/lib/db';

export type ParentDashboardStudent = {
  id: number;
  application_number: string | null;

  surname: string | null;
  middle_name: string | null;
  first_name: string | null;

  mobile: string | null;
  email: string | null;

  course: string | null;
  intake: string | null;

  application_fee: string | number | null;
  payment_status: string | null;
  application_status: string | null;

  guardian_name: string | null;
  guardian_relationship: string | null;
  guardian_mobile: string | null;
  guardian_email: string | null;

  sponsor_type: string | null;
  sponsor_name: string | null;
  sponsor_relationship: string | null;
  sponsor_mobile: string | null;
  sponsor_email: string | null;

  created_at: string | null;

  relationship: string | null;
  is_primary: boolean | null;

  admission_id: number | null;
  admission_number: string | null;
  admission_status: string | null;
  admission_date: string | null;
};

export type ParentDashboardParent = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type ParentDashboardData = {
  parent: ParentDashboardParent;
  student: ParentDashboardStudent | null;
};

/**
 * Gets the parent account and its linked student.
 *
 * The relationship is:
 *
 * users
 *   ↓
 * parent_students
 *   ↓
 * applications
 *   ↓
 * admissions
 *
 * React cache prevents duplicate database calls when the
 * layout and dashboard page request the same parent data
 * during the same server render.
 */
export const getParentDashboardData = cache(
  async (
    parentId: number
  ): Promise<ParentDashboardData | null> => {
    if (
      !Number.isInteger(parentId) ||
      parentId <= 0
    ) {
      return null;
    }

    const parentResult =
      await pool.query<ParentDashboardParent>(
        `
          SELECT
            id,
            name,
            email,
            phone
          FROM users
          WHERE
            id = $1
            AND role = 'parent'
            AND active = TRUE
          LIMIT 1
        `,
        [parentId]
      );

    if (parentResult.rows.length === 0) {
      return null;
    }

    const parent = parentResult.rows[0];

    const studentResult =
      await pool.query<ParentDashboardStudent>(
        `
          SELECT
            a.id,
            a.application_number,

            a.surname,
            a.middle_name,
            a.first_name,

            a.mobile,
            a.email,

            a.course,
            a.intake,

            a.application_fee,
            a.payment_status,
            a.application_status,

            a.guardian_name,
            a.guardian_relationship,
            a.guardian_mobile,
            a.guardian_email,

            a.sponsor_type,
            a.sponsor_name,
            a.sponsor_relationship,
            a.sponsor_mobile,
            a.sponsor_email,

            a.created_at,

            ps.relationship,
            ps.is_primary,

            ad.id AS admission_id,
            ad.admission_number,
            ad.admission_status,
            ad.admission_date

          FROM parent_students ps

          INNER JOIN applications a
            ON a.id = ps.application_id

          LEFT JOIN admissions ad
            ON ad.application_id = a.id

          WHERE
            ps.parent_id = $1

          ORDER BY
            ps.is_primary DESC,
            a.created_at DESC

          LIMIT 1
        `,
        [parentId]
      );

    return {
      parent,
      student:
        studentResult.rows[0] ?? null,
    };
  }
);