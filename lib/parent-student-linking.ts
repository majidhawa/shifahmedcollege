
import type { PoolClient } from 'pg';

type ParentContact = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  relationship?: string | null;
};

type LinkParentOptions = {
  applicationId: number;
  guardian: ParentContact;
  sponsor?: ParentContact | null;
};

type LinkApplicationsOptions = {
  parentId: number;
};

type ParentAccount = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
};

type ApplicationRecord = {
  id: number;
  data: Record<string, unknown>;
};

/**
 * Normalise email addresses for reliable matching.
 */
function normalizeEmail(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

/**
 * Normalise Kenyan phone numbers.
 *
 * 0712539907   -> 254712539907
 * 712530907    -> 254712530907
 * 254712539907 -> 254712539907
 */
function normalizePhone(value?: string | null): string {
  let digits = (value || '').replace(/\D/g, '');

  if (!digits) return '';

  if (digits.startsWith('0') && digits.length === 10) {
    digits = `254${digits.slice(1)}`;
  } else if (
    (digits.startsWith('7') || digits.startsWith('1')) &&
    digits.length === 9
  ) {
    digits = `254${digits}`;
  }

  return digits;
}

/**
 * Match a parent account against an application contact.
 *
 * At least one matching identifier is required.
 *
 * If both records have an email address, the emails
 * must match.
 *
 * If both records have a phone number, the phone
 * numbers must match.
 *
 * A missing email does not prevent phone matching.
 */
function matchesContact(
  account: ParentAccount,
  contact: ParentContact
): boolean {
  const accountEmail = normalizeEmail(account.email);
  const contactEmail = normalizeEmail(contact.email);

  const accountPhone = normalizePhone(account.phone);
  const contactPhone = normalizePhone(contact.phone);

  let hasMatchingIdentifier = false;

  if (accountEmail && contactEmail) {
    if (accountEmail !== contactEmail) {
      return false;
    }

    hasMatchingIdentifier = true;
  }

  if (accountPhone && contactPhone) {
    if (accountPhone !== contactPhone) {
      return false;
    }

    hasMatchingIdentifier = true;
  }

  return hasMatchingIdentifier;
}

/**
 * Read a string from application JSON data.
 *
 * Supports the different field names used by
 * previous application form versions.
 */
function getString(
  data: Record<string, unknown>,
  keys: string[]
): string {
  for (const key of keys) {
    const value = data[key];

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      return value.trim();
    }

    if (typeof value === 'number') {
      return String(value);
    }
  }

  return '';
}

/**
 * Extract guardian and sponsor contacts from an application.
 *
 * Actual database fields include:
 * guardian_mobile
 * sponsor_mobile
 *
 * Older field names are retained for compatibility.
 */
function getApplicationContacts(
  data: Record<string, unknown>
): Array<{
  contact: ParentContact;
  relationship: string;
}> {
  const guardian: ParentContact = {
    name: getString(data, [
      'guardian_name',
      'guardian_full_name',
    ]),

    email: getString(data, [
      'guardian_email',
      'guardian_email_address',
    ]),

    phone: getString(data, [
      'guardian_mobile',
      'guardian_phone',
      'guardian_phone_number',
      'guardian_contact',
    ]),

    relationship: getString(data, [
      'guardian_relationship',
    ]),
  };

  const contacts: Array<{
    contact: ParentContact;
    relationship: string;
  }> = [];

  // Add guardian when at least one identifier exists.
  if (guardian.email || guardian.phone) {
    contacts.push({
      contact: guardian,
      relationship:
        guardian.relationship || 'Parent/Guardian',
    });
  }

  const sponsorType = getString(data, [
    'sponsor_type',
    'sponsorType',
  ]).toLowerCase();

  // Do not treat the student as their own sponsor.
  if (sponsorType !== 'self') {
    const sponsor: ParentContact = {
      name: getString(data, [
        'sponsor_name',
        'sponsor_full_name',
      ]),

      email: getString(data, [
        'sponsor_email',
        'sponsor_email_address',
      ]),

      phone: getString(data, [
        'sponsor_mobile',
        'sponsor_phone',
        'sponsor_phone_number',
        'sponsor_contact',
      ]),

      relationship: getString(data, [
        'sponsor_relationship',
      ]),
    };

    if (sponsor.email || sponsor.phone) {
      contacts.push({
        contact: sponsor,
        relationship:
          sponsor.relationship || 'Sponsor',
      });
    }
  }

  return contacts;
}

/**
 * Insert a parent-student association if it does not
 * already exist.
 *
 * Returns true when a new association is inserted.
 * Returns false when it already exists.
 *
 * A unique database constraint is recommended to
 * protect against concurrent duplicate inserts.
 */
async function insertParentStudentLink(
  client: PoolClient,
  parentId: number,
  applicationId: number,
  relationship: string
): Promise<boolean> {
  const result = await client.query(
    `
      INSERT INTO parent_students (
        parent_id,
        application_id,
        relationship,
        is_primary
      )
      SELECT $1, $2, $3, FALSE
      WHERE NOT EXISTS (
        SELECT 1
        FROM parent_students
        WHERE parent_id = $1
          AND application_id = $2
      )
      RETURNING parent_id
    `,
    [
      parentId,
      applicationId,
      relationship,
    ]
  );

  return result.rows.length > 0;
}

/**
 * Direction 1:
 *
 * Automatically link existing parent accounts to a
 * newly submitted student application.
 *
 * Matching is performed using guardian and sponsor
 * contact information.
 *
 * Ambiguous matches are skipped.
 *
 * Call inside the same transaction that inserts
 * the application.
 *
 * Returns the IDs of parents associated with the
 * application, including existing associations.
 */
export async function linkParentsToApplication(
  client: PoolClient,
  options: LinkParentOptions
): Promise<number[]> {
  const {
    applicationId,
    guardian,
    sponsor,
  } = options;

  const result = await client.query<ParentAccount>(
    `
      SELECT
        id,
        name,
        email,
        phone
      FROM users
      WHERE LOWER(role) = 'parent'
    `
  );

  const contacts: Array<{
    contact: ParentContact;
    relationship: string;
  }> = [];

  if (
    guardian.email?.trim() ||
    guardian.phone?.trim()
  ) {
    contacts.push({
      contact: guardian,
      relationship:
        guardian.relationship?.trim() ||
        'Parent/Guardian',
    });
  }

  if (
    sponsor &&
    (
      sponsor.email?.trim() ||
      sponsor.phone?.trim()
    )
  ) {
    contacts.push({
      contact: sponsor,
      relationship:
        sponsor.relationship?.trim() ||
        'Sponsor',
    });
  }

  const links = new Map<number, string>();

  for (const item of contacts) {
    const matchingParents = result.rows.filter(
      (parent) => matchesContact(parent, item.contact)
    );

    // Never automatically link an ambiguous contact.
    if (matchingParents.length !== 1) {
      continue;
    }

    const parent = matchingParents[0];

    // Guardian relationship takes priority when
    // the same parent matches both contacts.
    if (!links.has(parent.id)) {
      links.set(parent.id, item.relationship);
    }
  }

  const linkedParentIds: number[] = [];

  for (const [parentId, relationship] of links.entries()) {
    await insertParentStudentLink(
      client,
      parentId,
      applicationId,
      relationship
    );

    // Include existing as well as newly inserted links.
    linkedParentIds.push(parentId);
  }

  return linkedParentIds;
}

/**
 * Direction 2:
 *
 * Automatically link existing student applications
 * to a newly created or updated parent account.
 *
 * Application data is read through to_jsonb(a), allowing
 * optional fields to be accessed without referencing
 * potentially missing SQL columns.
 *
 * Supports:
 * guardian_mobile
 * sponsor_mobile
 * guardian_email
 * sponsor_email
 *
 * Parents without email addresses can still match
 * through their phone numbers.
 *
 * Ambiguous matches are never automatically linked.
 *
 * Call inside the same transaction that creates or
 * updates the parent account.
 *
 * Returns application IDs, including existing links.
 */
export async function linkApplicationsToParent(
  client: PoolClient,
  options: LinkApplicationsOptions
): Promise<number[]> {
  const { parentId } = options;

  const parentResult = await client.query<ParentAccount>(
    `
      SELECT
        id,
        name,
        email,
        phone
      FROM users
      WHERE id = $1
        AND LOWER(role) = 'parent'
      LIMIT 1
    `,
    [parentId]
  );

  if (parentResult.rows.length !== 1) {
    return [];
  }

  const parent = parentResult.rows[0];

  // At least one identifier is required.
  if (
    !normalizeEmail(parent.email) &&
    !normalizePhone(parent.phone)
  ) {
    return [];
  }

  const applicationsResult =
    await client.query<ApplicationRecord>(
      `
        SELECT
          a.id,
          to_jsonb(a) AS data
        FROM applications a
      `
    );

  const linkedApplicationIds: number[] = [];

  for (const application of applicationsResult.rows) {
    const contacts = getApplicationContacts(
      application.data
    );

    let matchedRelationship: string | null = null;

    for (const item of contacts) {
      if (matchesContact(parent, item.contact)) {
        // Guardian relationship takes priority.
        if (matchedRelationship === null) {
          matchedRelationship = item.relationship;
        }
      }
    }

    if (!matchedRelationship) {
      continue;
    }

    await insertParentStudentLink(
      client,
      parent.id,
      application.id,
      matchedRelationship
    );

    // Return both newly inserted and previously existing links.
    linkedApplicationIds.push(application.id);
  }

  return linkedApplicationIds;
}
