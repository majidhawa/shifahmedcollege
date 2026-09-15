import { NextResponse } from "next/server";

import pool from "@/lib/db";
import { getStudentSession } from "@/lib/student-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* =========================================================
TYPES
========================================================= */

type AnnouncementRow = {
id: number;
title: string;
message: string;
audience: string;
priority: string;
status: string;
publish_at: string | Date | null;
expires_at: string | Date | null;
is_pinned: boolean;
created_at: string | Date | null;
updated_at: string | Date | null;
created_by: number | null;
created_by_name: string | null;
program_id: number | null;
program_name: string | null;
unit_id: number | null;
unit_name: string | null;
};

type CountRow = {
count: string | number;
};

/* =========================================================
HELPERS
========================================================= */

function toISOStringOrNull(
value: string | Date | null | undefined
): string | null {
if (value === null || value === undefined) {
return null;
}

const date = new Date(String(value));

if (Number.isNaN(date.getTime())) {
return null;
}

return date.toISOString();
}

function parsePositiveInteger(
value: string | null,
fallback: number
): number {
if (!value) {
return fallback;
}

const parsed = Number(value);

if (!Number.isInteger(parsed) || parsed <= 0) {
return fallback;
}

return parsed;
}

function cleanSearch(value: string | null): string {
return value?.trim() ?? "";
}

/* =========================================================
STUDENT ANNOUNCEMENT TARGETING
========================================================= */

/*
An announcement belongs to a student when:

1. It is global:
   program_id IS NULL
   unit_id IS NULL

2. It targets the student's active program:
   program_id IS NOT NULL
   unit_id IS NULL
   active enrollment matches program

3. It targets a unit:
   unit_id IS NOT NULL
   active unit enrollment matches
   and, where supplied, program also matches.

IMPORTANT:
The application ID comes from the authenticated
student session and is NEVER supplied by the client.
*/

const ANNOUNCEMENT_TARGETING_SQL = `  (
    (
      a.program_id IS NULL
      AND a.unit_id IS NULL
    )
    OR
    (
      a.program_id IS NOT NULL
      AND a.unit_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM lms_enrollments le
        WHERE le.application_id = $1
          AND le.enrollment_status = 'active'
          AND le.program_id = a.program_id
      )
    )
    OR
    (
      a.unit_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM lms_enrollments le
        INNER JOIN lms_unit_enrollments lue
          ON lue.enrollment_id = le.id
        WHERE le.application_id = $1
          AND le.enrollment_status = 'active'
          AND lue.unit_id = a.unit_id
          AND lue.status = 'active'
          AND (
            a.program_id IS NULL
            OR le.program_id = a.program_id
          )
      )
    )
  )`;

/* =========================================================
GET STUDENT ANNOUNCEMENTS
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
      message: "Student authentication required.",
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
      message: "Invalid student session.",
    },
    { status: 401 }
  );
}

/* =======================================================
   QUERY PARAMETERS
======================================================= */

const { searchParams } = new URL(request.url);

const search = cleanSearch(
  searchParams.get("search")
);

const priority =
  searchParams.get("priority")?.trim().toLowerCase() ||
  "all";

const pinned =
  searchParams.get("pinned")?.trim().toLowerCase() ||
  "all";

const limit = Math.min(
  parsePositiveInteger(
    searchParams.get("limit"),
    50
  ),
  100
);

/* =======================================================
   VALIDATE PRIORITY
======================================================= */

const allowedPriorities = new Set([
  "low",
  "normal",
  "high",
  "urgent",
]);

if (
  priority !== "all" &&
  !allowedPriorities.has(priority)
) {
  return NextResponse.json(
    {
      success: false,
      message: "Invalid priority filter.",
    },
    { status: 400 }
  );
}

/* =======================================================
   BASE CONDITIONS
======================================================= */

const values: Array<string | number> = [
  applicationId,
];

let parameterIndex = 2;

const conditions: string[] = [
  `a.status = 'published'`,
  `a.audience IN ('students', 'all')`,
  `a.publish_at <= CURRENT_TIMESTAMP`,
  `
    (
      a.expires_at IS NULL
      OR a.expires_at > CURRENT_TIMESTAMP
    )
  `,
  ANNOUNCEMENT_TARGETING_SQL,
];

/* =======================================================
   SEARCH
======================================================= */

if (search) {
  values.push(`%${search}%`);

  conditions.push(`
    (
      a.title ILIKE $${parameterIndex}
      OR a.message ILIKE $${parameterIndex}
    )
  `);

  parameterIndex += 1;
}

/* =======================================================
   PRIORITY
======================================================= */

if (priority !== "all") {
  values.push(priority);

  conditions.push(
    `LOWER(a.priority) = LOWER($${parameterIndex})`
  );

  parameterIndex += 1;
}

/* =======================================================
   PINNED
======================================================= */

if (pinned === "true") {
  conditions.push(`a.is_pinned = TRUE`);
}

if (pinned === "false") {
  conditions.push(`a.is_pinned = FALSE`);
}

/* =======================================================
   LIMIT
======================================================= */

values.push(limit);

const limitParameter = parameterIndex;

/* =======================================================
   GET ANNOUNCEMENTS
======================================================= */

const result =
  await pool.query<AnnouncementRow>(
    `
      SELECT
        a.id,
        a.title,
        a.message,
        a.audience,
        a.priority,
        a.status,

        a.publish_at,
        a.expires_at,

        a.is_pinned,

        a.created_at,
        a.updated_at,

        a.created_by,

        creator.name AS created_by_name,

        a.program_id,
        p.name AS program_name,

        a.unit_id,
        u.name AS unit_name

      FROM lms_announcements a

      LEFT JOIN users creator
        ON creator.id = a.created_by

      LEFT JOIN lms_programs p
        ON p.id = a.program_id

      LEFT JOIN lms_units u
        ON u.id = a.unit_id

      WHERE ${conditions.join("\nAND ")}

      ORDER BY
        a.is_pinned DESC,
        CASE a.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        a.publish_at DESC,
        a.id DESC

      LIMIT $${limitParameter}
    `,
    values
  );

/* =======================================================
   TOTAL COUNT
======================================================= */

const countValues = values.slice(
  0,
  values.length - 1
);

const countResult =
  await pool.query<CountRow>(
    `
      SELECT COUNT(*)::int AS count

      FROM lms_announcements a

      WHERE ${conditions.join("\nAND ")}
    `,
    countValues
  );

/* =======================================================
   STATISTICS
======================================================= */

const statisticsResult =
  await pool.query<{
    total: string | number;
    pinned: string | number;
    urgent: string | number;
  }>(
    `
      SELECT
        COUNT(*)::int AS total,

        COUNT(*) FILTER (
          WHERE a.is_pinned = TRUE
        )::int AS pinned,

        COUNT(*) FILTER (
          WHERE a.priority = 'urgent'
        )::int AS urgent

      FROM lms_announcements a

      WHERE
        a.status = 'published'
        AND a.audience IN ('students', 'all')
        AND a.publish_at <= CURRENT_TIMESTAMP
        AND (
          a.expires_at IS NULL
          OR a.expires_at > CURRENT_TIMESTAMP
        )
        AND ${ANNOUNCEMENT_TARGETING_SQL}
    `,
    [applicationId]
  );

/* =======================================================
   SERIALIZE
======================================================= */

const announcements = result.rows.map(
  (row) => ({
    id: Number(row.id),

    title: row.title,

    message: row.message,

    audience: row.audience,

    priority: row.priority,

    status: row.status,

    publish_at:
      toISOStringOrNull(
        row.publish_at
      ),

    expires_at:
      toISOStringOrNull(
        row.expires_at
      ),

    is_pinned:
      Boolean(row.is_pinned),

    created_at:
      toISOStringOrNull(
        row.created_at
      ),

    updated_at:
      toISOStringOrNull(
        row.updated_at
      ),

    created_by:
      row.created_by === null
        ? null
        : Number(row.created_by),

    created_by_name:
      row.created_by_name ?? null,

    program_id:
      row.program_id === null
        ? null
        : Number(row.program_id),

    program_name:
      row.program_name ?? null,

    unit_id:
      row.unit_id === null
        ? null
        : Number(row.unit_id),

    unit_name:
      row.unit_name ?? null,
  })
);

const statistics =
  statisticsResult.rows[0];

return NextResponse.json(
  {
    success: true,

    announcements,

    totalCount:
      Number(
        countResult.rows[0]?.count ?? 0
      ),

    statistics: {
      total:
        Number(
          statistics?.total ?? 0
        ),

      pinned:
        Number(
          statistics?.pinned ?? 0
        ),

      urgent:
        Number(
          statistics?.urgent ?? 0
        ),
    },
  },
  {
    status: 200,
    headers: {
      "Cache-Control":
        "private, no-store, max-age=0",
    },
  }
);

} catch (error) {
console.error(
"STUDENT ANNOUNCEMENTS GET ERROR:",
error
);

return NextResponse.json(
  {
    success: false,
    message:
      "Unable to load student announcements.",
  },
  { status: 500 }
);

}
}
