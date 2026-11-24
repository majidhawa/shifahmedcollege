
'use client';

import React, {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/* =========================================================
   TYPES
========================================================= */

type SponsorType =
  | 'Self'
  | 'Parent'
  | 'Guardian'
  | 'Sponsor'
  | '';

type PaymentStatus =
  | 'payment_pending'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected';

type ApplicationData = {
  surname: string;
  middleName: string;
  firstName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  country: string;
  idPassportNumber: string;
  maritalStatus: string;

  postalAddress: string;
  postalCode: string;
  town: string;
  county: string;
  mobile: string;
  email: string;

  kcseIndex: string;
  kcseYear: string;
  kcseMeanGrade: string;
  englishGrade: string;
  kiswahiliGrade: string;
  biologyGrade: string;
  chemistryGrade: string;
  physicsGrade: string;
  mathematicsGrade: string;
  previousInstitution: string;
  highestQualification: string;

  course: string;
  intake: string;

  sponsorType: SponsorType;
  sponsorName: string;
  sponsorRelationship: string;
  sponsorMobile: string;
  sponsorEmail: string;

  guardianName: string;
  guardianRelationship: string;
  guardianMobile: string;
  guardianEmail: string;

  idDocument: File | null;
  kcseCertificate: File | null;
  passportPhoto: File | null;
  birthCertificate: File | null;
  leavingCertificate: File | null;
  schoolTestimonials: File | null;
  additionalAcademicCertificates: File[];
  otherSupportingDocuments: File[];
  declaration: boolean;
};

type SubmittedApplication = {
  id: number;
  application_number: string;
  course: string;
  intake: string;
  application_fee: number;
  payment_status: string;
  application_status: string;
};

type PaymentData = {
  status?: string;
  paymentStatus?: string;

  mpesaReceipt?: string;
  receipt?: string;

  mpesaCode?: string;
  transactionCode?: string;

  manualMpesaCode?: string;
  manual_mpesa_code?: string;

  manualMpesaPhone?: string;
  manual_mpesa_phone?: string;

  amount?: number;

  transactionDate?: string;
  transaction_date?: string;

  phoneNumber?: string;
  phone?: string;

  rejectionReason?: string;
  rejection_reason?: string;

  manualPaymentSubmittedAt?: string;
  manual_payment_submitted_at?: string;
};

type PaymentStatusResponse = {
  success?: boolean;
  message?: string;
  payment?: PaymentData;
  paymentStatus?: string;
  rejectionReason?: string;
  rejection_reason?: string;
  manualMpesaCode?: string;
  manual_mpesa_code?: string;
  manualMpesaPhone?: string;
  manual_mpesa_phone?: string;
};

/* =========================================================
   INITIAL DATA
========================================================= */

const initialData: ApplicationData = {
  surname: '',
  middleName: '',
  firstName: '',
  dateOfBirth: '',
  gender: '',
  nationality: 'Kenyan',
  country: 'Kenya',
  idPassportNumber: '',
  maritalStatus: '',

  postalAddress: '',
  postalCode: '',
  town: '',
  county: '',
  mobile: '',
  email: '',

  kcseIndex: '',
  kcseYear: '',
  kcseMeanGrade: '',
  englishGrade: '',
  kiswahiliGrade: '',
  biologyGrade: '',
  chemistryGrade: '',
  physicsGrade: '',
  mathematicsGrade: '',
  previousInstitution: '',
  highestQualification: '',

  course: '',
  intake: '',

  sponsorType: '',
  sponsorName: '',
  sponsorRelationship: '',
  sponsorMobile: '',
  sponsorEmail: '',

  guardianName: '',
  guardianRelationship: '',
  guardianMobile: '',
  guardianEmail: '',

  idDocument: null,
  kcseCertificate: null,
  passportPhoto: null,
  birthCertificate: null,
  leavingCertificate: null,
  schoolTestimonials: null,
  additionalAcademicCertificates: [],
  otherSupportingDocuments: [],

  declaration: false,
};

/* =========================================================
   OPTIONS
========================================================= */

const steps = [
  'Personal',
  'Contact',
  'Academic',
  'Course',
  'Guardian',
  'Documents',
  'Review',
];

const courses = [
  'Diploma in Mortuary Science Level 6 (Technologist)',
  'Certificate in Mortuary Science Level 5 (Technician)',
  'Certificate in Caregiving Level 4',
  'Phlebotomy',
  'Certificate in EMT',
  'Diploma in EMT',
  'Paramedicine Level 6',
  'Dialysis Technology',
  'ACLS and BLS',
  'German Language (A1) Proficiency',
  'German Language (A2) Proficiency',
  'German Language (B1) Proficiency',
  'German Language (B2) Proficiency',
  'Certificate in Community Health Level 5',
  'Diploma in Community Health Level 6',
  'Certificate in Health Service Support Level 5',
];

const intakes = [
  'January 2027 Intake',
  'March 2027 Intake',
  'May 2027 Intake',
];

const kcseGrades = [
  'A',
  'A-',
  'B+',
  'B',
  'B-',
  'C+',
  'C',
  'C-',
  'D+',
  'D',
  'D-',
  'E',
];

/* =========================================================
   M-PESA DETAILS
========================================================= */

const APPLICATION_FEE = 1500;
const MPESA_PAYBILL = '247247';
const MPESA_ACCOUNT = '0330287421280';

/* =========================================================
   STYLES
========================================================= */

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-2 focus:ring-green-600/10 disabled:cursor-not-allowed disabled:bg-slate-100';

const buttonBase =
  'inline-flex items-center justify-center rounded-full px-7 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50';

/* =========================================================
   HELPERS
========================================================= */

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email.trim()
  );
}

function normalizeMpesaPhone(phone: string) {
  return phone.trim().replace(/\s+/g, '');
}

function isValidMpesaPhone(phone: string) {
  return /^(?:07\d{8}|01\d{8}|2547\d{8}|2541\d{8}|\+2547\d{8}|\+2541\d{8})$/.test(
    normalizeMpesaPhone(phone)
  );
}

function isValidMpesaCode(code: string) {
  return /^[A-Z0-9]{8,15}$/i.test(code.trim());
}

function normalizePaymentStatus(
  status: string
): PaymentStatus | '' {
  const normalized = status
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (
    [
      'payment_pending',
      'pending_payment',
      'unpaid',
      'pending',
    ].includes(normalized)
  ) {
    return 'payment_pending';
  }

  if (
    [
      'awaiting_approval',
      'awaiting_verification',
      'verification_pending',
      'submitted',
      'pending_verification',
    ].includes(normalized)
  ) {
    return 'awaiting_approval';
  }

  if (
    ['approved', 'paid', 'verified'].includes(
      normalized
    )
  ) {
    return 'approved';
  }

  if (
    ['rejected', 'declined'].includes(normalized)
  ) {
    return 'rejected';
  }

  return '';
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export function ApplyForm() {
  const formContainerRef =
    useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState(1);

  const [data, setData] =
    useState<ApplicationData>(initialData);

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  const [submitting, setSubmitting] =
    useState(false);

  const [submitError, setSubmitError] =
    useState('');

  /*
   * applicationSaved means the application record
   * has been created and an application number exists.
   *
   * It does NOT mean the application has been
   * formally submitted for admission consideration.
   */
  const [applicationSaved, setApplicationSaved] =
    useState(false);

  const [submittedApplication, setSubmittedApplication] =
    useState<SubmittedApplication | null>(null);

  /* =======================================================
     MANUAL PAYMENT STATE
  ======================================================= */

  const [mpesaCode, setMpesaCode] = useState('');
  const [submittedMpesaCode, setSubmittedMpesaCode] =
    useState('');

  const [mpesaPhone, setMpesaPhone] = useState('');
  const [submittedMpesaPhone, setSubmittedMpesaPhone] =
    useState('');

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>('payment_pending');

  const [paymentSubmitting, setPaymentSubmitting] =
    useState(false);

  const [paymentMessage, setPaymentMessage] =
    useState('');

  const [paymentError, setPaymentError] =
    useState('');

  const [paymentChecking, setPaymentChecking] =
    useState(false);

  const [paymentApproved, setPaymentApproved] =
    useState(false);

  const [paymentRejected, setPaymentRejected] =
    useState(false);

  const [paymentRejectionReason, setPaymentRejectionReason] =
    useState('');

  const [mpesaReceipt, setMpesaReceipt] =
    useState('');

  const [paymentTransactionDate, setPaymentTransactionDate] =
    useState('');

  const [paymentPhoneNumber, setPaymentPhoneNumber] =
    useState('');

  const [paymentAmount, setPaymentAmount] =
    useState<number | null>(null);

  /* =======================================================
     SCROLL
  ======================================================= */

  const scrollToForm = useCallback(() => {
    window.setTimeout(() => {
      formContainerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  }, []);

  /* =======================================================
     UPDATE FIELD
  ======================================================= */

  const updateField = <K extends keyof ApplicationData>(
    field: K,
    value: ApplicationData[K]
  ) => {
    setData((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => {
      if (!current[field]) return current;

      const updated = { ...current };
      delete updated[field];

      return updated;
    });

    setSubmitError('');
  };

  /* =======================================================
     PAYMENT STATE
  ======================================================= */

  const applyPaymentState = useCallback(
    (
      status: PaymentStatus,
      rejectionReason = ''
    ) => {
      setPaymentStatus(status);

      if (status === 'payment_pending') {
        setPaymentApproved(false);
        setPaymentRejected(false);
        setPaymentRejectionReason('');

        setPaymentMessage(
          'Complete your M-Pesa payment and enter the transaction details below.'
        );

        return;
      }

      if (status === 'awaiting_approval') {
        setPaymentApproved(false);
        setPaymentRejected(false);
        setPaymentRejectionReason('');

        setPaymentMessage(
          'Your M-Pesa transaction details have been received and are awaiting administrator verification.'
        );

        return;
      }

      if (status === 'rejected') {
        setPaymentApproved(false);
        setPaymentRejected(true);
        setPaymentRejectionReason(rejectionReason);

        setPaymentMessage(
          'Your payment verification was rejected. Review the reason and submit the correct transaction details.'
        );

        return;
      }

      if (status === 'approved') {
        setPaymentApproved(true);
        setPaymentRejected(false);
        setPaymentRejectionReason('');

        setPaymentMessage(
          'Your application fee has been approved by SMTC administration.'
        );
      }
    },
    []
  );

  const paymentFieldsLocked =
    paymentSubmitting ||
    paymentStatus === 'awaiting_approval' ||
    paymentStatus === 'approved';

  /* =======================================================
     PAYMENT STATUS POLLING

     Backend remains the source of truth.
  ======================================================= */

  useEffect(() => {
    const applicationNumber =
      submittedApplication?.application_number;

    if (!applicationSaved || !applicationNumber) {
      return;
    }

    let cancelled = false;
    let intervalId: number | undefined;

    const checkPaymentStatus = async () => {
      if (cancelled) return;

      try {
        setPaymentChecking(true);

        const response = await fetch(
          `/api/applications/${encodeURIComponent(
            applicationNumber
          )}/payment-status`,
          {
            method: 'GET',
            cache: 'no-store',
          }
        );

        const result: PaymentStatusResponse =
          await response.json();

        if (
          !response.ok ||
          !result?.success ||
          cancelled
        ) {
          return;
        }

        const payment = result.payment || {};

        const rawStatus =
          payment.status ||
          payment.paymentStatus ||
          result.paymentStatus ||
          '';

        const normalizedStatus =
          normalizePaymentStatus(rawStatus);

        const returnedCode =
          payment.manualMpesaCode ||
          payment.manual_mpesa_code ||
          payment.mpesaCode ||
          payment.transactionCode ||
          result.manualMpesaCode ||
          result.manual_mpesa_code ||
          '';

        if (returnedCode) {
          setSubmittedMpesaCode(returnedCode);
          setMpesaCode(returnedCode);
        }

        const returnedPhone =
          payment.manualMpesaPhone ||
          payment.manual_mpesa_phone ||
          payment.phoneNumber ||
          payment.phone ||
          result.manualMpesaPhone ||
          result.manual_mpesa_phone ||
          '';

        if (returnedPhone) {
          setSubmittedMpesaPhone(returnedPhone);
          setMpesaPhone(returnedPhone);
          setPaymentPhoneNumber(returnedPhone);
        }

        if (
          payment.amount !== undefined &&
          payment.amount !== null
        ) {
          setPaymentAmount(Number(payment.amount));
        }

        setMpesaReceipt(
          payment.mpesaReceipt ||
            payment.receipt ||
            ''
        );

        setPaymentTransactionDate(
          payment.transactionDate ||
            payment.transaction_date ||
            ''
        );

        const rejectionReason =
          payment.rejectionReason ||
          payment.rejection_reason ||
          result.rejectionReason ||
          result.rejection_reason ||
          '';

        if (!normalizedStatus || cancelled) return;

        applyPaymentState(
          normalizedStatus,
          rejectionReason
        );

        if (
          normalizedStatus === 'approved' ||
          normalizedStatus === 'rejected'
        ) {
          if (intervalId) {
            window.clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error(
          'Payment status checking error:',
          error
        );
      } finally {
        if (!cancelled) {
          setPaymentChecking(false);
        }
      }
    };

    void checkPaymentStatus();

    intervalId = window.setInterval(
      checkPaymentStatus,
      5000
    );

    return () => {
      cancelled = true;

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [
    applicationSaved,
    submittedApplication?.application_number,
    applyPaymentState,
  ]);

  /* =======================================================
     VALIDATE STEP
  ======================================================= */

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!data.surname.trim()) {
        newErrors.surname = 'Surname is required.';
      }

      if (!data.firstName.trim()) {
        newErrors.firstName = 'First name is required.';
      }

      if (!data.dateOfBirth) {
        newErrors.dateOfBirth =
          'Date of birth is required.';
      }

      if (!data.gender) {
        newErrors.gender = 'Please select your gender.';
      }

      if (!data.idPassportNumber.trim()) {
        newErrors.idPassportNumber =
          'ID or Passport number is required.';
      }
    }

    if (step === 2) {
      if (!data.mobile.trim()) {
        newErrors.mobile = 'Mobile number is required.';
      }

      if (!data.email.trim()) {
        newErrors.email = 'Email address is required.';
      } else if (!isValidEmail(data.email)) {
        newErrors.email =
          'Please enter a valid email address.';
      }

      if (!data.county.trim()) {
        newErrors.county = 'County is required.';
      }
    }

    if (step === 3) {
      if (!data.kcseIndex.trim()) {
        newErrors.kcseIndex =
          'KCSE index number is required.';
      }

      if (!data.kcseYear.trim()) {
        newErrors.kcseYear = 'KCSE year is required.';
      } else {
        const year = Number(data.kcseYear);

        if (
          !Number.isInteger(year) ||
          year < 1990 ||
          year > new Date().getFullYear()
        ) {
          newErrors.kcseYear =
            'Please enter a valid KCSE year.';
        }
      }

      if (!data.kcseMeanGrade) {
        newErrors.kcseMeanGrade =
          'KCSE mean grade is required.';
      }
    }

    if (step === 4) {
      if (!data.course) {
        newErrors.course = 'Please select a course.';
      }

      if (!data.intake) {
        newErrors.intake = 'Please select an intake.';
      }

      if (!data.sponsorType) {
        newErrors.sponsorType =
          'Please select the sponsor type.';
      }

      if (
        data.sponsorType &&
        data.sponsorType !== 'Self' &&
        !data.sponsorName.trim()
      ) {
        newErrors.sponsorName =
          'Sponsor name is required.';
      }

      if (
        data.sponsorEmail.trim() &&
        !isValidEmail(data.sponsorEmail)
      ) {
        newErrors.sponsorEmail =
          'Please enter a valid sponsor email.';
      }
    }

    if (step === 5) {
      if (!data.guardianName.trim()) {
        newErrors.guardianName =
          'Parent/Guardian name is required.';
      }

      if (!data.guardianMobile.trim()) {
        newErrors.guardianMobile =
          'Parent/Guardian mobile number is required.';
      }

      if (
        data.guardianEmail.trim() &&
        !isValidEmail(data.guardianEmail)
      ) {
        newErrors.guardianEmail =
          'Please enter a valid guardian email.';
      }
    }

    if (step === 6) {
      if (!data.idDocument) {
        newErrors.idDocument =
          'National ID or Passport is required. Applicants without an ID may use a parent’s ID.';
      }

      if (!data.kcseCertificate) {
        newErrors.kcseCertificate =
          'KCSE Certificate or Result Slip is required.';
      }

      if (!data.passportPhoto) {
        newErrors.passportPhoto =
          'Passport size photo is required.';
      }
    }

    if (step === 7 && !data.declaration) {
      newErrors.declaration =
        'You must accept the declaration before submitting.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const nextStep = () => {
    if (!validateStep()) return;

    setStep((current) =>
      Math.min(current + 1, steps.length)
    );

    scrollToForm();
  };

  const previousStep = () => {
    setErrors({});
    setSubmitError('');

    setStep((current) =>
      Math.max(current - 1, 1)
    );

    scrollToForm();
  };

  /* =======================================================
     APPLICATION SUBMISSION

     This creates/saves the application record.

     The frontend deliberately does not call this
     "formally submitted" until the payment process
     has been approved and the backend has applied
     the appropriate application-status transition.
  ======================================================= */

  const handleFinalSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (submitting || applicationSaved) return;

    if (!validateStep()) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const formData = new FormData();

      const textFields: Array<
        [keyof ApplicationData, string]
      > = [
        ['surname', data.surname.trim()],
        ['middleName', data.middleName.trim()],
        ['firstName', data.firstName.trim()],
        ['dateOfBirth', data.dateOfBirth],
        ['gender', data.gender],
        ['nationality', data.nationality.trim()],
        ['country', data.country.trim()],
        ['idPassportNumber', data.idPassportNumber.trim()],
        ['maritalStatus', data.maritalStatus],

        ['postalAddress', data.postalAddress.trim()],
        ['postalCode', data.postalCode.trim()],
        ['town', data.town.trim()],
        ['county', data.county.trim()],
        ['mobile', data.mobile.trim()],
        ['email', data.email.trim()],

        ['kcseIndex', data.kcseIndex.trim()],
        ['kcseYear', data.kcseYear.trim()],
        ['kcseMeanGrade', data.kcseMeanGrade],
        ['englishGrade', data.englishGrade],
        ['kiswahiliGrade', data.kiswahiliGrade],
        ['biologyGrade', data.biologyGrade],
        ['chemistryGrade', data.chemistryGrade],
        ['physicsGrade', data.physicsGrade],
        ['mathematicsGrade', data.mathematicsGrade],
        ['previousInstitution', data.previousInstitution.trim()],
        ['highestQualification', data.highestQualification.trim()],

        ['course', data.course],
        ['intake', data.intake],

        ['sponsorType', data.sponsorType],
        ['sponsorName', data.sponsorName.trim()],
        ['sponsorRelationship', data.sponsorRelationship.trim()],
        ['sponsorMobile', data.sponsorMobile.trim()],
        ['sponsorEmail', data.sponsorEmail.trim()],

        ['guardianName', data.guardianName.trim()],
        ['guardianRelationship', data.guardianRelationship],
        ['guardianMobile', data.guardianMobile.trim()],
        ['guardianEmail', data.guardianEmail.trim()],

        ['declaration', String(data.declaration)],
      ];

      for (const [key, value] of textFields) {
        formData.append(key, value);
      }

      if (data.idDocument) {
        formData.append(
          'idDocument',
          data.idDocument,
          data.idDocument.name
        );
      }

      if (data.kcseCertificate) {
        formData.append(
          'kcseCertificate',
          data.kcseCertificate,
          data.kcseCertificate.name
        );
      }

      if (data.passportPhoto) {
        formData.append(
          'passportPhoto',
          data.passportPhoto,
          data.passportPhoto.name
        );
      }

      // OPTIONAL SINGLE DOCUMENTS

      if (data.birthCertificate) {
        formData.append(
          'birthCertificate',
          data.birthCertificate,
          data.birthCertificate.name
        );
      }

      if (data.leavingCertificate) {
        formData.append(
          'leavingCertificate',
          data.leavingCertificate,
          data.leavingCertificate.name
        );
      }

      if (data.schoolTestimonials) {
        formData.append(
          'schoolTestimonials',
          data.schoolTestimonials,
          data.schoolTestimonials.name
        );
      }

      // MULTIPLE ADDITIONAL ACADEMIC CERTIFICATES

      data.additionalAcademicCertificates.forEach((file) => {
        formData.append(
          'additionalAcademicCertificates',
          file,
          file.name
        );
      });

      // MULTIPLE OTHER SUPPORTING DOCUMENTS

      data.otherSupportingDocuments.forEach((file) => {
        formData.append(
          'otherSupportingDocuments',
          file,
          file.name
        );
      });      const response = await fetch('/api/applications', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();

      let result:
        | {
            success?: boolean;
            message?: string;
            application?: SubmittedApplication;
          }
        | null = null;

      try {
        result = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        throw new Error(
          'The server returned an invalid response.'
        );
      }

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message ||
            'Unable to save your application.'
        );
      }

      const application = result.application;

      if (
        !application ||
        !application.application_number
      ) {
        throw new Error(
          'The application was saved, but the server did not return an application number. Please contact SMTC before submitting another application.'
        );
      }

      setSubmittedApplication(application);

      setMpesaCode('');
      setSubmittedMpesaCode('');

      setMpesaPhone(data.mobile || '');
      setSubmittedMpesaPhone('');

      setPaymentStatus('payment_pending');

      setPaymentSubmitting(false);
      setPaymentChecking(false);

      setPaymentApproved(false);
      setPaymentRejected(false);
      setPaymentRejectionReason('');

      setPaymentError('');

      setPaymentMessage(
        'Your application details have been saved. Please pay the application fee and submit your M-Pesa transaction details for verification.'
      );

      setMpesaReceipt('');
      setPaymentTransactionDate('');
      setPaymentPhoneNumber('');
      setPaymentAmount(null);

      setApplicationSaved(true);

      scrollToForm();
    } catch (error) {
      console.error(
        'Application saving error:',
        error
      );

      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Something went wrong while saving your application.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================================================
     SUBMIT MANUAL M-PESA VERIFICATION
  ======================================================= */

  const handlePaymentVerification = async () => {
    if (paymentSubmitting) return;

    setPaymentError('');
    setPaymentMessage('');

    const applicationNumber =
      submittedApplication?.application_number;

    if (!applicationNumber) {
      setPaymentError(
        'Application number is missing. Please contact SMTC.'
      );
      return;
    }

    if (
      paymentStatus !== 'payment_pending' &&
      paymentStatus !== 'rejected'
    ) {
      return;
    }

    const code = mpesaCode.trim().toUpperCase();

    if (!code) {
      setPaymentError(
        'Please enter your M-Pesa transaction code.'
      );
      return;
    }

    if (!isValidMpesaCode(code)) {
      setPaymentError(
        'Please enter a valid M-Pesa transaction code.'
      );
      return;
    }

    const phone = normalizeMpesaPhone(mpesaPhone);

    if (!phone) {
      setPaymentError(
        'Please enter the M-Pesa phone number used to make the payment.'
      );
      return;
    }

    if (!isValidMpesaPhone(phone)) {
      setPaymentError(
        'Please enter a valid Kenyan M-Pesa phone number.'
      );
      return;
    }

    setPaymentSubmitting(true);

    try {
      const response = await fetch(
        `/api/applications/${encodeURIComponent(
          applicationNumber
        )}/payment-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mpesaCode: code,
            mpesaPhone: phone,
            manualMpesaCode: code,
            manualMpesaPhone: phone,
            manual_mpesa_code: code,
            manual_mpesa_phone: phone,
          }),
        }
      );

      const responseText = await response.text();

      let result:
        | {
            success?: boolean;
            message?: string;
            payment?: PaymentData;
            manualMpesaCode?: string;
            manual_mpesa_code?: string;
            manualMpesaPhone?: string;
            manual_mpesa_phone?: string;
          }
        | null = null;

      try {
        result = responseText
          ? JSON.parse(responseText)
          : null;
      } catch {
        throw new Error(
          'The payment verification server returned an invalid response.'
        );
      }

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message ||
            'Unable to submit your M-Pesa transaction details.'
        );
      }

      const payment = result.payment || {};

      const returnedStatus =
        payment.status ||
        payment.paymentStatus ||
        'awaiting_approval';

      const normalizedStatus =
        normalizePaymentStatus(returnedStatus);

      const finalStatus =
        normalizedStatus || 'awaiting_approval';

      const returnedCode =
        payment.manualMpesaCode ||
        payment.manual_mpesa_code ||
        payment.mpesaCode ||
        payment.transactionCode ||
        result.manualMpesaCode ||
        result.manual_mpesa_code ||
        code;

      const returnedPhone =
        payment.manualMpesaPhone ||
        payment.manual_mpesa_phone ||
        payment.phoneNumber ||
        payment.phone ||
        result.manualMpesaPhone ||
        result.manual_mpesa_phone ||
        phone;

      setMpesaCode(returnedCode);
      setSubmittedMpesaCode(returnedCode);

      setMpesaPhone(returnedPhone);
      setSubmittedMpesaPhone(returnedPhone);

      setPaymentPhoneNumber(returnedPhone);

      if (
        payment.amount !== undefined &&
        payment.amount !== null
      ) {
        setPaymentAmount(Number(payment.amount));
      }

      setMpesaReceipt(
        payment.mpesaReceipt ||
          payment.receipt ||
          ''
      );

      setPaymentTransactionDate(
        payment.transactionDate ||
          payment.transaction_date ||
          ''
      );

      const rejectionReason =
        payment.rejectionReason ||
        payment.rejection_reason ||
        '';

      applyPaymentState(
        finalStatus,
        rejectionReason
      );
    } catch (error) {
      console.error(
        'Payment verification submission error:',
        error
      );

      setPaymentError(
        error instanceof Error
          ? error.message
          : 'Unable to submit your M-Pesa transaction details.'
      );

      /*
       * Do not lock the fields when the server
       * did not accept the verification request.
       */
      setPaymentStatus('payment_pending');
      setPaymentRejected(false);
      setPaymentApproved(false);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  /* =======================================================
     APPLICATION SAVED / PAYMENT SCREEN
  ======================================================= */

  if (
    applicationSaved &&
    submittedApplication
  ) {
    const applicationFee =
      Number(submittedApplication.application_fee) ||
      APPLICATION_FEE;

    const displayedPaymentAmount =
      paymentAmount ?? applicationFee;

    const displayedPaymentStatus =
      paymentStatus === 'approved'
        ? 'Approved'
        : paymentStatus === 'rejected'
        ? 'Rejected'
        : paymentStatus === 'awaiting_approval'
        ? 'Awaiting Approval'
        : 'Payment Pending';

    const displayedApplicationStatus =
      paymentStatus === 'approved'
        ? 'Fee Approved — Awaiting Admission Review'
        : paymentStatus === 'rejected'
        ? 'Payment Rejected'
        : paymentStatus === 'awaiting_approval'
        ? 'Awaiting Payment Verification'
        : 'Awaiting Application Fee';

    return (
      <div
        ref={formContainerRef}
        className="rounded-2xl border border-green-200 bg-green-50 p-6 sm:p-8"
      >
        {/* HEADER */}

        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-2xl font-bold text-white shadow-lg">
            ✓
          </div>

          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-green-700">
            Application Record Saved
          </p>

          <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Your Application Details Have Been Saved
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">
            Your application record has been created.
            To proceed with the admission process,
            you must first pay the application fee of
            KSh 1,500 and have your M-Pesa transaction
            verified by SMTC administration.
          </p>
        </div>

        {/* APPLICATION NUMBER */}

        <div className="mx-auto mt-7 max-w-lg rounded-2xl border-2 border-green-300 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Your Application Number
          </p>

          <p className="mt-2 break-all text-2xl font-extrabold tracking-wide text-green-700 sm:text-3xl">
            {submittedApplication.application_number}
          </p>

          <p className="mt-3 text-xs text-slate-500">
            Keep this number safe. You will need it
            when communicating with SMTC.
          </p>
        </div>

        {/* APPLICATION DETAILS */}

        <div className="mx-auto mt-6 max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Application Details
            </h3>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <ConfirmationItem
              label="Application Number"
              value={submittedApplication.application_number}
            />

            <ConfirmationItem
              label="Course"
              value={submittedApplication.course}
            />

            <ConfirmationItem
              label="Intake"
              value={submittedApplication.intake}
            />

            <ConfirmationItem
              label="Application Fee"
              value={`KSh ${applicationFee.toLocaleString()}`}
            />

            <ConfirmationItem
              label="Payment Status"
              value={displayedPaymentStatus}
              status
            />

            <ConfirmationItem
              label="Application Progress"
              value={displayedApplicationStatus}
              status
            />
          </div>
        </div>

        {/* PAYMENT SECTION */}

        {!paymentApproved && (
          <div className="mx-auto mt-6 max-w-lg">
            {/* PAYMENT PENDING */}

            {paymentStatus === 'payment_pending' && (
              <div className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-xs font-extrabold text-white">
                    KSh
                  </div>

                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-green-700">
                    Required Step
                  </p>

                  <h3 className="mt-1 text-2xl font-extrabold text-slate-900">
                    Pay Application Fee
                  </h3>

                  <p className="mt-1 text-3xl font-extrabold text-green-700">
                    KSh {applicationFee.toLocaleString()}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Complete the application fee payment
                    using the official M-Pesa PayBill
                    details below.
                  </p>
                </div>

                {/* M-PESA DETAILS */}

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-green-700">
                    M-Pesa Payment Instructions
                  </p>

                  <div className="mt-4 space-y-3">
                    <PaymentDetail
                      label="PayBill Number"
                      value={MPESA_PAYBILL}
                    />

                    <PaymentDetail
                      label="Account Number"
                      value={MPESA_ACCOUNT}
                    />

                    <PaymentDetail
                      label="Amount"
                      value={`KSh ${applicationFee.toLocaleString()}`}
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm font-semibold leading-6 text-yellow-800">
                    Make the payment first. After
                    receiving your M-Pesa confirmation
                    message, enter the phone number
                    used for payment and the transaction
                    code below.
                  </p>
                </div>

                {/* PHONE */}

                <div className="mt-6">
                  <label
                    htmlFor="mpesa-phone"
                    className="text-sm font-bold text-slate-900"
                  >
                    M-Pesa Phone Number
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    id="mpesa-phone"
                    type="tel"
                    autoComplete="tel"
                    value={mpesaPhone}
                    disabled={paymentFieldsLocked}
                    onChange={(event) => {
                      setMpesaPhone(event.target.value);
                      setPaymentError('');
                      setPaymentMessage('');
                    }}
                    placeholder="e.g. 0712345678"
                    maxLength={13}
                    className={inputClass}
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Enter the M-Pesa phone number used
                    to make the application fee payment.
                  </p>
                </div>

                {/* TRANSACTION CODE */}

                <div className="mt-5">
                  <label
                    htmlFor="mpesa-code"
                    className="text-sm font-bold text-slate-900"
                  >
                    M-Pesa Transaction Code
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    id="mpesa-code"
                    type="text"
                    autoComplete="off"
                    value={mpesaCode}
                    disabled={paymentFieldsLocked}
                    onChange={(event) => {
                      setMpesaCode(
                        event.target.value
                          .toUpperCase()
                          .replace(/\s/g, '')
                      );

                      setPaymentError('');
                      setPaymentMessage('');
                    }}
                    placeholder="e.g. UH5021U1A2"
                    maxLength={15}
                    className={inputClass}
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Enter the transaction code exactly
                    as shown in your M-Pesa confirmation
                    message.
                  </p>
                </div>

                {paymentError && (
                  <Alert type="error">
                    {paymentError}
                  </Alert>
                )}

                <button
                  type="button"
                  onClick={handlePaymentVerification}
                  disabled={
                    paymentSubmitting ||
                    !mpesaCode.trim() ||
                    !mpesaPhone.trim()
                  }
                  className={`${buttonBase} mt-5 w-full bg-green-600 text-white shadow-sm hover:bg-green-700`}
                >
                  {paymentSubmitting
                    ? 'Submitting for Verification...'
                    : 'Submit M-Pesa Details for Verification'}
                </button>
              </div>
            )}

            {/* AWAITING APPROVAL */}

            {paymentStatus === 'awaiting_approval' && (
              <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-6">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500 text-lg font-bold text-white">
                    ...
                  </div>

                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-yellow-700">
                    Payment Awaiting Approval
                  </p>

                  <h3 className="mt-1 text-xl font-extrabold text-slate-900">
                    Verification in Progress
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-yellow-800">
                    Your M-Pesa transaction details have
                    been received successfully.
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    SMTC administration will verify
                    your payment. Please do not submit
                    the same transaction again.
                  </p>
                </div>

                <div className="mt-5 rounded-xl border border-yellow-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    M-Pesa Phone Number
                  </p>

                  <p className="mt-2 text-lg font-extrabold text-slate-900">
                    {submittedMpesaPhone || mpesaPhone}
                  </p>

                  <span className="mt-3 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                    Locked — Awaiting Approval
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-yellow-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Submitted Transaction Code
                  </p>

                  <p className="mt-2 break-all text-lg font-extrabold text-green-700">
                    {submittedMpesaCode || mpesaCode}
                  </p>

                  <span className="mt-3 inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
                    Locked — Awaiting Approval
                  </span>
                </div>

                {paymentMessage && (
                  <div className="mt-4 rounded-xl border border-yellow-200 bg-white p-4">
                    <p className="text-sm font-bold text-yellow-800">
                      Payment Awaiting Approval
                    </p>

                    <p className="mt-1 text-sm leading-6 text-yellow-700">
                      {paymentMessage}
                    </p>
                  </div>
                )}

                {paymentChecking && (
                  <div className="mt-5 text-center">
                    <p className="text-xs font-semibold text-yellow-700">
                      Checking payment approval status...
                    </p>

                    <div className="mx-auto mt-3 h-5 w-5 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
                  </div>
                )}
              </div>
            )}

            {/* REJECTED */}

            {paymentStatus === 'rejected' && (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-6">
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-xl font-bold text-white">
                    !
                  </div>

                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-red-700">
                    Payment Rejected
                  </p>

                  <h3 className="mt-1 text-xl font-extrabold text-slate-900">
                    Payment Could Not Be Approved
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-red-700">
                    Your submitted M-Pesa transaction
                    details were not approved by SMTC
                    administration.
                  </p>
                </div>

                {paymentRejectionReason && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-red-500">
                      Rejection Reason
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {paymentRejectionReason}
                    </p>
                  </div>
                )}

                <div className="mt-6">
                  <label
                    htmlFor="corrected-mpesa-phone"
                    className="text-sm font-bold text-slate-900"
                  >
                    M-Pesa Phone Number
                  </label>

                  <input
                    id="corrected-mpesa-phone"
                    type="tel"
                    autoComplete="tel"
                    value={mpesaPhone}
                    disabled={paymentSubmitting}
                    onChange={(event) => {
                      setMpesaPhone(event.target.value);
                      setPaymentError('');
                    }}
                    placeholder="e.g. 0712345678"
                    maxLength={13}
                    className={inputClass}
                  />
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="corrected-mpesa-code"
                    className="text-sm font-bold text-slate-900"
                  >
                    Correct M-Pesa Transaction Code
                  </label>

                  <input
                    id="corrected-mpesa-code"
                    type="text"
                    autoComplete="off"
                    value={mpesaCode}
                    disabled={paymentSubmitting}
                    onChange={(event) => {
                      setMpesaCode(
                        event.target.value
                          .toUpperCase()
                          .replace(/\s/g, '')
                      );

                      setPaymentError('');
                    }}
                    placeholder="Enter corrected transaction code"
                    maxLength={15}
                    className={inputClass}
                  />

                  <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    Transaction details unlocked
                  </span>
                </div>

                {paymentError && (
                  <Alert type="error">
                    {paymentError}
                  </Alert>
                )}

                <button
                  type="button"
                  onClick={handlePaymentVerification}
                  disabled={
                    paymentSubmitting ||
                    !mpesaCode.trim() ||
                    !mpesaPhone.trim()
                  }
                  className={`${buttonBase} mt-5 w-full bg-green-600 text-white shadow-sm hover:bg-green-700`}
                >
                  {paymentSubmitting
                    ? 'Submitting for Verification...'
                    : 'Submit Corrected Details'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* PAYMENT APPROVED */}

        {paymentApproved && (
          <div className="mx-auto mt-6 max-w-lg rounded-2xl border border-green-300 bg-white p-6 shadow-sm">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600 text-2xl font-bold text-white shadow-lg">
                ✓
              </div>

              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-green-700">
                Payment Approved
              </p>

              <h3 className="mt-1 text-2xl font-extrabold text-slate-900">
                Application Fee Approved
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your M-Pesa payment has been verified
                and approved by SMTC administration.
              </p>
            </div>

            <div className="mt-6 space-y-4 rounded-xl bg-slate-50 p-5">
              <PaymentDetail
                label="Amount Paid"
                value={`KSh ${displayedPaymentAmount.toLocaleString()}`}
              />

              <PaymentDetail
                label="M-Pesa Transaction Code"
                value={
                  submittedMpesaCode ||
                  mpesaCode ||
                  'Verified'
                }
              />

              <PaymentDetail
                label="M-Pesa Phone"
                value={
                  submittedMpesaPhone ||
                  paymentPhoneNumber ||
                  'Verified'
                }
              />

              <PaymentDetail
                label="Payment Status"
                value="Approved"
              />

              {paymentTransactionDate && (
                <PaymentDetail
                  label="Transaction Date"
                  value={paymentTransactionDate}
                />
              )}

              {mpesaReceipt &&
                mpesaReceipt !== submittedMpesaCode && (
                  <PaymentDetail
                    label="M-Pesa Receipt"
                    value={mpesaReceipt}
                  />
                )}
            </div>

            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-800">
                Application Fee Successfully Approved
              </p>

              <p className="mt-1 text-xs leading-5 text-green-700">
                Your application fee has been approved.
                Your application can now proceed to the
                admission review stage according to
                SMTC's application processing workflow.
              </p>
            </div>

            <a
              href={`/api/applications/${encodeURIComponent(
                submittedApplication.application_number
              )}/receipt`}
              className={`${buttonBase} mt-5 w-full bg-green-600 text-white shadow-sm hover:bg-green-700`}
            >
              Download Official Receipt
            </a>

            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              Your official PDF receipt is available
              because your payment has been approved.
            </p>
          </div>
        )}

        {/* APPLICATION NUMBER REMINDER */}

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-xs leading-6 text-slate-500">
            Keep your application number for future
            communication with Shifah Medical Training
            College.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     APPLICATION FORM
  ======================================================= */

  return (
    <div ref={formContainerRef} className="w-full">
      <form onSubmit={handleFinalSubmit}>
        {/* PROGRESS */}

        <div className="mb-10">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-yellow-600">
                SMTC Admission
              </p>

              <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                Step {step} of {steps.length}
              </h2>
            </div>

            <p className="text-sm font-semibold text-slate-500">
              {steps[step - 1]}
            </p>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            aria-label={`Application progress: step ${step} of ${steps.length}`}
          >
            <div
              className="h-full rounded-full bg-green-600 transition-all duration-300"
              style={{
                width: `${(step / steps.length) * 100}%`,
              }}
            />
          </div>

          <div className="mt-5 hidden gap-2 md:flex">
            {steps.map((item, index) => {
              const number = index + 1;
              const active = number === step;
              const completed = number < step;

              return (
                <div
                  key={item}
                  className={`flex-1 text-center text-[11px] font-bold ${
                    active || completed
                      ? 'text-green-600'
                      : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                      active || completed
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {completed ? '✓' : number}
                  </span>

                  {item}
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: PERSONAL */}

        {step === 1 && (
          <section>
            <SectionTitle
              title="Personal Information"
              description="Enter your personal information as it appears on your official documents."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Surname" required error={errors.surname}>
                <input
                  className={inputClass}
                  value={data.surname}
                  autoComplete="family-name"
                  onChange={(e) =>
                    updateField('surname', e.target.value)
                  }
                  placeholder="Enter surname"
                />
              </Field>

              <Field label="Middle Name">
                <input
                  className={inputClass}
                  value={data.middleName}
                  autoComplete="additional-name"
                  onChange={(e) =>
                    updateField('middleName', e.target.value)
                  }
                  placeholder="Enter middle name"
                />
              </Field>

              <Field label="First Name" required error={errors.firstName}>
                <input
                  className={inputClass}
                  value={data.firstName}
                  autoComplete="given-name"
                  onChange={(e) =>
                    updateField('firstName', e.target.value)
                  }
                  placeholder="Enter first name"
                />
              </Field>

              <Field
                label="Date of Birth"
                required
                error={errors.dateOfBirth}
              >
                <input
                  type="date"
                  className={inputClass}
                  value={data.dateOfBirth}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) =>
                    updateField('dateOfBirth', e.target.value)
                  }
                />
              </Field>

              <Field label="Gender" required error={errors.gender}>
                <select
                  className={inputClass}
                  value={data.gender}
                  onChange={(e) =>
                    updateField('gender', e.target.value)
                  }
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </Field>

              <Field label="Nationality">
                <input
                  className={inputClass}
                  value={data.nationality}
                  onChange={(e) =>
                    updateField('nationality', e.target.value)
                  }
                />
              </Field>

              <Field label="Country">
                <input
                  className={inputClass}
                  value={data.country}
                  onChange={(e) =>
                    updateField('country', e.target.value)
                  }
                />
              </Field>

              <Field
                label="ID / Passport Number"
                required
                error={errors.idPassportNumber}
              >
                <input
                  className={inputClass}
                  value={data.idPassportNumber}
                  onChange={(e) =>
                    updateField('idPassportNumber', e.target.value)
                  }
                  placeholder="Enter ID or passport number"
                />
              </Field>

              <Field label="Marital Status">
                <select
                  className={inputClass}
                  value={data.maritalStatus}
                  onChange={(e) =>
                    updateField('maritalStatus', e.target.value)
                  }
                >
                  <option value="">Select marital status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </Field>
            </div>
          </section>
        )}

        {/* STEP 2: CONTACT */}

        {step === 2 && (
          <section>
            <SectionTitle
              title="Contact Details"
              description="Provide accurate contact details so SMTC can communicate with you."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Postal Address">
                <input
                  className={inputClass}
                  value={data.postalAddress}
                  onChange={(e) =>
                    updateField('postalAddress', e.target.value)
                  }
                  placeholder="P.O. Box / Postal Address"
                />
              </Field>

              <Field label="Postal Code">
                <input
                  className={inputClass}
                  value={data.postalCode}
                  onChange={(e) =>
                    updateField('postalCode', e.target.value)
                  }
                  placeholder="e.g. 30200"
                />
              </Field>

              <Field label="Town">
                <input
                  className={inputClass}
                  value={data.town}
                  onChange={(e) =>
                    updateField('town', e.target.value)
                  }
                  placeholder="Enter town"
                />
              </Field>

              <Field label="County" required error={errors.county}>
                <input
                  className={inputClass}
                  value={data.county}
                  onChange={(e) =>
                    updateField('county', e.target.value)
                  }
                  placeholder="Enter county"
                />
              </Field>

              <Field label="Mobile Number" required error={errors.mobile}>
                <input
                  type="tel"
                  className={inputClass}
                  value={data.mobile}
                  autoComplete="tel"
                  onChange={(e) =>
                    updateField('mobile', e.target.value)
                  }
                  placeholder="e.g. 0712345678"
                />
              </Field>

              <Field label="Email Address" required error={errors.email}>
                <input
                  type="email"
                  className={inputClass}
                  value={data.email}
                  autoComplete="email"
                  onChange={(e) =>
                    updateField('email', e.target.value)
                  }
                  placeholder="example@email.com"
                />
              </Field>
            </div>
          </section>
        )}

        {/* STEP 3: ACADEMIC */}

        {step === 3 && (
          <section>
            <SectionTitle
              title="Academic Information"
              description="Enter your KCSE information and previous educational background."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="KCSE Index Number"
                required
                error={errors.kcseIndex}
              >
                <input
                  className={inputClass}
                  value={data.kcseIndex}
                  onChange={(e) =>
                    updateField('kcseIndex', e.target.value)
                  }
                  placeholder="Enter KCSE index number"
                />
              </Field>

              <Field label="KCSE Year" required error={errors.kcseYear}>
                <input
                  type="number"
                  min="1990"
                  max={new Date().getFullYear()}
                  className={inputClass}
                  value={data.kcseYear}
                  onChange={(e) =>
                    updateField('kcseYear', e.target.value)
                  }
                  placeholder="e.g. 2025"
                />
              </Field>

              <Field
                label="KCSE Mean Grade"
                required
                error={errors.kcseMeanGrade}
              >
                <select
                  className={inputClass}
                  value={data.kcseMeanGrade}
                  onChange={(e) =>
                    updateField('kcseMeanGrade', e.target.value)
                  }
                >
                  <option value="">Select mean grade</option>
                  {kcseGrades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </Field>

              <GradeField
                label="English Grade"
                value={data.englishGrade}
                onChange={(value) =>
                  updateField('englishGrade', value)
                }
              />

              <GradeField
                label="Kiswahili Grade"
                value={data.kiswahiliGrade}
                onChange={(value) =>
                  updateField('kiswahiliGrade', value)
                }
              />

              <GradeField
                label="Biology Grade"
                value={data.biologyGrade}
                onChange={(value) =>
                  updateField('biologyGrade', value)
                }
              />

              <GradeField
                label="Chemistry Grade"
                value={data.chemistryGrade}
                onChange={(value) =>
                  updateField('chemistryGrade', value)
                }
              />

              <GradeField
                label="Physics Grade"
                value={data.physicsGrade}
                onChange={(value) =>
                  updateField('physicsGrade', value)
                }
              />

              <GradeField
                label="Mathematics Grade"
                value={data.mathematicsGrade}
                onChange={(value) =>
                  updateField('mathematicsGrade', value)
                }
              />

              <Field label="Previous Institution">
                <input
                  className={inputClass}
                  value={data.previousInstitution}
                  onChange={(e) =>
                    updateField(
                      'previousInstitution',
                      e.target.value
                    )
                  }
                  placeholder="Previous school / college"
                />
              </Field>

              <Field label="Highest Qualification">
                <input
                  className={inputClass}
                  value={data.highestQualification}
                  onChange={(e) =>
                    updateField(
                      'highestQualification',
                      e.target.value
                    )
                  }
                  placeholder="e.g. KCSE"
                />
              </Field>
            </div>
          </section>
        )}

        {/* STEP 4: COURSE AND SPONSOR */}

        {step === 4 && (
          <section>
            <SectionTitle
              title="Course & Sponsorship"
              description="Select your preferred course and provide sponsorship information."
            />

            <div className="space-y-6">
              <Field label="Course Applied For" required error={errors.course}>
                <select
                  className={inputClass}
                  value={data.course}
                  onChange={(e) =>
                    updateField('course', e.target.value)
                  }
                >
                  <option value="">Select course</option>
                  {courses.map((course) => (
                    <option key={course} value={course}>
                      {course}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Preferred Intake" required error={errors.intake}>
                <select
                  className={inputClass}
                  value={data.intake}
                  onChange={(e) =>
                    updateField('intake', e.target.value)
                  }
                >
                  <option value="">Select intake</option>
                  {intakes.map((intake) => (
                    <option key={intake} value={intake}>
                      {intake}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-sm font-extrabold text-slate-900">
                  Sponsorship Information
                </h4>

                <p className="mt-1 text-xs leading-6 text-slate-500">
                  Tell us who will be responsible for
                  financing your education.
                </p>
              </div>

              <Field
                label="Who will sponsor your studies?"
                required
                error={errors.sponsorType}
              >
                <select
                  className={inputClass}
                  value={data.sponsorType}
                  onChange={(e) =>
                    updateField(
                      'sponsorType',
                      e.target.value as SponsorType
                    )
                  }
                >
                  <option value="">Select sponsor</option>
                  <option value="Self">Self</option>
                  <option value="Parent">Parent</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Sponsor">Sponsor</option>
                </select>
              </Field>

              {data.sponsorType && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label={
                      data.sponsorType === 'Self'
                        ? 'Applicant Name'
                        : 'Sponsor Name'
                    }
                    required={data.sponsorType !== 'Self'}
                    error={errors.sponsorName}
                  >
                    <input
                      className={inputClass}
                      value={data.sponsorName}
                      onChange={(e) =>
                        updateField('sponsorName', e.target.value)
                      }
                      placeholder="Enter full name"
                    />
                  </Field>

                  <Field label="Relationship">
                    <input
                      className={inputClass}
                      value={data.sponsorRelationship}
                      onChange={(e) =>
                        updateField(
                          'sponsorRelationship',
                          e.target.value
                        )
                      }
                      placeholder="e.g. Father"
                    />
                  </Field>

                  <Field label="Mobile Number">
                    <input
                      type="tel"
                      className={inputClass}
                      value={data.sponsorMobile}
                      onChange={(e) =>
                        updateField('sponsorMobile', e.target.value)
                      }
                      placeholder="Sponsor mobile number"
                    />
                  </Field>

                  <Field
                    label="Email Address"
                    error={errors.sponsorEmail}
                  >
                    <input
                      type="email"
                      className={inputClass}
                      value={data.sponsorEmail}
                      onChange={(e) =>
                        updateField('sponsorEmail', e.target.value)
                      }
                      placeholder="Sponsor email"
                    />
                  </Field>
                </div>
              )}

              <FeeNotice />
            </div>
          </section>
        )}

        {/* STEP 5: GUARDIAN */}

        {step === 5 && (
          <section>
            <SectionTitle
              title="Parent / Guardian / Next of Kin"
              description="Provide a person SMTC can contact when necessary."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Full Name"
                required
                error={errors.guardianName}
              >
                <input
                  className={inputClass}
                  value={data.guardianName}
                  onChange={(e) =>
                    updateField('guardianName', e.target.value)
                  }
                  placeholder="Full name"
                />
              </Field>

              <Field label="Relationship">
                <select
                  className={inputClass}
                  value={data.guardianRelationship}
                  onChange={(e) =>
                    updateField(
                      'guardianRelationship',
                      e.target.value
                    )
                  }
                >
                  <option value="">Select relationship</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </Field>

              <Field
                label="Mobile Number"
                required
                error={errors.guardianMobile}
              >
                <input
                  type="tel"
                  className={inputClass}
                  value={data.guardianMobile}
                  onChange={(e) =>
                    updateField('guardianMobile', e.target.value)
                  }
                  placeholder="e.g. 0712345678"
                />
              </Field>

              <Field
                label="Email Address"
                error={errors.guardianEmail}
              >
                <input
                  type="email"
                  className={inputClass}
                  value={data.guardianEmail}
                  onChange={(e) =>
                    updateField('guardianEmail', e.target.value)
                  }
                  placeholder="guardian@email.com"
                />
              </Field>
            </div>
          </section>
        )}

               {/* STEP 6: DOCUMENTS */}

        {step === 6 && (
          <section>
            <SectionTitle
              title="Supporting Documents"
              description="Upload the required documents and any additional supporting documents that may strengthen your application."
            />

            <div className="space-y-6">
              {/* REQUIRED DOCUMENTS */}

              <div>
                <h4 className="mb-4 text-sm font-extrabold text-slate-900">
                  Required Documents
                </h4>

                <div className="space-y-5">
                  <FileField
                    label="National ID / Passport"
                    required
                    file={data.idDocument}
                    error={errors.idDocument}
                    onChange={(file) =>
                      updateField('idDocument', file)
                    }
                  />

                  <FileField
                    label="KCSE Certificate / Result Slip"
                    required
                    file={data.kcseCertificate}
                    error={errors.kcseCertificate}
                    onChange={(file) =>
                      updateField('kcseCertificate', file)
                    }
                  />

                  <FileField
                    label="Passport Size Photo"
                    required
                    file={data.passportPhoto}
                    error={errors.passportPhoto}
                    onChange={(file) =>
                      updateField('passportPhoto', file)
                    }
                  />
                </div>
              </div>

              {/* OPTIONAL DOCUMENTS */}

              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-sm font-extrabold text-slate-900">
                  Additional Supporting Documents
                </h4>

                <p className="mt-1 text-xs leading-6 text-slate-500">
                  These documents are optional. Upload them where
                  applicable to support your application.
                </p>

                <div className="mt-5 space-y-5">
                  <FileField
                    label="Birth Certificate"
                    file={data.birthCertificate}
                    onChange={(file) =>
                      updateField('birthCertificate', file)
                    }
                  />

                  <FileField
                    label="School Leaving Certificate"
                    file={data.leavingCertificate}
                    onChange={(file) =>
                      updateField('leavingCertificate', file)
                    }
                  />

                  <FileField
                    label="School Testimonials"
                    file={data.schoolTestimonials}
                    onChange={(file) =>
                      updateField('schoolTestimonials', file)
                    }
                  />

                  <MultiFileField
                    label="Additional Academic Certificates"
                    description="Upload other academic certificates, professional qualifications or relevant training certificates."
                    files={data.additionalAcademicCertificates}
                    onChange={(files) =>
                      updateField(
                        'additionalAcademicCertificates',
                        files
                      )
                    }
                  />

                  <MultiFileField
                    label="Other Supporting Documents"
                    description="Upload any other documents relevant to your application."
                    files={data.otherSupportingDocuments}
                    onChange={(files) =>
                      updateField(
                        'otherSupportingDocuments',
                        files
                      )
                    }
                  />
                </div>
              </div>

              {/* UPLOAD GUIDELINES */}

              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-bold text-green-800">
                  Document Upload Guidelines
                </p>

                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-6 text-green-700">
                  <li>Accepted formats: PDF, JPG, JPEG and PNG.</li>
                  <li>Maximum file size: 5 MB per document.</li>
                  <li>Ensure uploaded documents are clear and readable.</li>
                  <li>Required documents must be uploaded before proceeding.</li>
                  <li>Additional supporting documents are optional.</li>
                </ul>
              </div>
            </div>
          </section>
        )}
        {/* STEP 7: REVIEW */}

        {step === 7 && (
          <section>
            <SectionTitle
              title="Review Your Application"
              description="Review all information carefully before saving your application."
            />

            <div className="space-y-6">
              <ReviewSection title="Personal Information">
                <ReviewItem
                  label="Full Name"
                  value={[
                    data.surname,
                    data.middleName,
                    data.firstName,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />

                <ReviewItem label="Date of Birth" value={data.dateOfBirth} />
                <ReviewItem label="Gender" value={data.gender} />
                <ReviewItem label="Nationality" value={data.nationality} />
                <ReviewItem label="Country" value={data.country} />
                <ReviewItem
                  label="ID / Passport"
                  value={data.idPassportNumber}
                />
                <ReviewItem
                  label="Marital Status"
                  value={data.maritalStatus}
                />
              </ReviewSection>

              <ReviewSection title="Contact Details">
                <ReviewItem label="Mobile" value={data.mobile} />
                <ReviewItem label="Email" value={data.email} />
                <ReviewItem label="Town" value={data.town} />
                <ReviewItem label="County" value={data.county} />
                <ReviewItem
                  label="Postal Address"
                  value={data.postalAddress}
                />
                <ReviewItem
                  label="Postal Code"
                  value={data.postalCode}
                />
              </ReviewSection>

              <ReviewSection title="Academic Information">
                <ReviewItem
                  label="KCSE Index"
                  value={data.kcseIndex}
                />
                <ReviewItem label="KCSE Year" value={data.kcseYear} />
                <ReviewItem
                  label="Mean Grade"
                  value={data.kcseMeanGrade}
                />
                <ReviewItem label="English" value={data.englishGrade} />
                <ReviewItem
                  label="Kiswahili"
                  value={data.kiswahiliGrade}
                />
                <ReviewItem label="Biology" value={data.biologyGrade} />
                <ReviewItem
                  label="Chemistry"
                  value={data.chemistryGrade}
                />
                <ReviewItem label="Physics" value={data.physicsGrade} />
                <ReviewItem
                  label="Mathematics"
                  value={data.mathematicsGrade}
                />
                <ReviewItem
                  label="Previous Institution"
                  value={data.previousInstitution}
                />
                <ReviewItem
                  label="Highest Qualification"
                  value={data.highestQualification}
                />
              </ReviewSection>

              <ReviewSection title="Course & Intake">
                <ReviewItem label="Course" value={data.course} />
                <ReviewItem label="Intake" value={data.intake} />
                <ReviewItem
                  label="Sponsor Type"
                  value={data.sponsorType}
                />
              </ReviewSection>

              <ReviewSection title="Sponsor Information">
                <ReviewItem label="Name" value={data.sponsorName} />
                <ReviewItem
                  label="Relationship"
                  value={data.sponsorRelationship}
                />
                <ReviewItem
                  label="Mobile"
                  value={data.sponsorMobile}
                />
                <ReviewItem label="Email" value={data.sponsorEmail} />
              </ReviewSection>

              <ReviewSection title="Parent / Guardian">
                <ReviewItem label="Name" value={data.guardianName} />
                <ReviewItem
                  label="Relationship"
                  value={data.guardianRelationship}
                />
                <ReviewItem
                  label="Mobile"
                  value={data.guardianMobile}
                />
                <ReviewItem
                  label="Email"
                  value={data.guardianEmail}
                />
              </ReviewSection>

                           <ReviewSection title="Documents">
                <ReviewItem
                  label="ID / Passport"
                  value={
                    data.idDocument?.name || 'Not uploaded'
                  }
                />

                <ReviewItem
                  label="KCSE Certificate"
                  value={
                    data.kcseCertificate?.name ||
                    'Not uploaded'
                  }
                />

                <ReviewItem
                  label="Passport Photo"
                  value={
                    data.passportPhoto?.name ||
                    'Not uploaded'
                  }
                />

                <ReviewItem
                  label="Birth Certificate"
                  value={
                    data.birthCertificate?.name ||
                    'Not uploaded'
                  }
                />

                <ReviewItem
                  label="School Leaving Certificate"
                  value={
                    data.leavingCertificate?.name ||
                    'Not uploaded'
                  }
                />

                <ReviewItem
                  label="School Testimonials"
                  value={
                    data.schoolTestimonials?.name ||
                    'Not uploaded'
                  }
                />

                <ReviewItem
                  label="Additional Academic Certificates"
                  value={
                    data.additionalAcademicCertificates.length
                      ? data.additionalAcademicCertificates
                          .map((file) => file.name)
                          .join(', ')
                      : 'Not uploaded'
                  }
                />

                <ReviewItem
                  label="Other Supporting Documents"
                  value={
                    data.otherSupportingDocuments.length
                      ? data.otherSupportingDocuments
                          .map((file) => file.name)
                          .join(', ')
                      : 'Not uploaded'
                  }
                />
            
              </ReviewSection>

              {/* DECLARATION */}

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={data.declaration}
                    onChange={(e) =>
                      updateField(
                        'declaration',
                        e.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4 accent-green-600"
                  />

                  <span className="text-sm leading-6 text-slate-700">
                    I declare that the information provided
                    in this application is true, accurate
                    and complete to the best of my knowledge.
                    I understand that providing false
                    information may result in cancellation
                    of my application or admission.
                  </span>
                </label>

                {errors.declaration && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    {errors.declaration}
                  </p>
                )}
              </div>

              <FeeNotice />

              {submitError && (
                <Alert type="error">
                  {submitError}
                </Alert>
              )}

              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-bold text-green-800">
                  Important: Application Fee Required
                </p>

                <p className="mt-1 text-sm leading-6 text-green-700">
                  Saving your application details does
                  not complete the admission application
                  process. You must pay the KSh 1,500
                  application fee and receive payment
                  approval from SMTC.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* NAVIGATION */}

        <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={previousStep}
              disabled={submitting}
              className={`${buttonBase} border border-slate-200 text-slate-600 hover:border-green-600 hover:text-green-600`}
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < steps.length ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={submitting}
              className={`${buttonBase} bg-green-600 text-white shadow-sm hover:bg-green-700`}
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className={`${buttonBase} bg-yellow-500 text-slate-900 shadow-sm hover:bg-yellow-400`}
            >
              {submitting
                ? 'Saving Application...'
                : 'Save Application & Continue to Payment'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   REUSABLE COMPONENTS
========================================================= */

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <h3 className="text-2xl font-extrabold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-900">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {children}

      {error && (
        <p
          className="mt-1 text-xs font-medium text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function GradeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-900">
        {label}
      </label>

      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select grade</option>

        {kcseGrades.map((grade) => (
          <option key={grade} value={grade}>
            {grade}
          </option>
        ))}
      </select>
    </div>
  );
}

/* =========================================================
   FILE FIELD
========================================================= */

function FileField({
  label,
  required = false,
  file,
  error,
  onChange,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  error?: string;
  onChange: (file: File | null) => void;
}) {
  const [fileError, setFileError] = useState('');

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile =
      event.target.files?.[0] ?? null;

    if (!selectedFile) {
      onChange(null);
      setFileError('');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(selectedFile.type)) {
      onChange(null);
      setFileError(
        'Invalid file format. Upload a PDF, JPG or PNG file.'
      );
      event.target.value = '';
      return;
    }

    if (selectedFile.size > maxSize) {
      onChange(null);
      setFileError(
        'The selected file exceeds the 5 MB limit.'
      );
      event.target.value = '';
      return;
    }

    onChange(selectedFile);
    setFileError('');
  };

  return (
    <div>
      <label className="text-sm font-bold text-slate-900">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        className={`mt-2 block w-full rounded-xl border ${
          error || fileError
            ? 'border-red-300'
            : 'border-dashed border-slate-300'
        } bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-green-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white`}
      />

      {file && (
        <p className="mt-2 text-xs font-medium text-green-700">
          ✓ {file.name}
        </p>
      )}

      {(error || fileError) && (
        <p
          className="mt-1 text-xs font-medium text-red-600"
          role="alert"
        >
          {fileError || error}
        </p>
      )}
    </div>
  );
}
/* =========================================================
   MULTIPLE FILE FIELD
========================================================= */

function MultiFileField({
  label,
  description,
  files,
  onChange,
}: {
  label: string;
  description?: string;
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const [fileError, setFileError] = useState('');

  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ];

  const maxSize = 5 * 1024 * 1024;

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    if (!selectedFiles.length) return;

    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];

    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        rejectedFiles.push(
          `${file.name}: Unsupported file format`
        );
        continue;
      }

      if (file.size > maxSize) {
        rejectedFiles.push(
          `${file.name}: Exceeds the 5 MB limit`
        );
        continue;
      }

      const alreadyExists = files.some(
        (existingFile) =>
          existingFile.name === file.name &&
          existingFile.size === file.size
      );

      const alreadySelected = validFiles.some(
        (existingFile) =>
          existingFile.name === file.name &&
          existingFile.size === file.size
      );

      if (alreadyExists || alreadySelected) {
        rejectedFiles.push(
          `${file.name}: Already added`
        );
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onChange([...files, ...validFiles]);
    }

    setFileError(
      rejectedFiles.length
        ? rejectedFiles.join('. ')
        : ''
    );

    // Allow selecting the same file again after removal.
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    onChange(
      files.filter((_, fileIndex) => fileIndex !== index)
    );

    setFileError('');
  };

  return (
    <div>
      <label className="text-sm font-bold text-slate-900">
        {label}
        <span className="ml-2 text-xs font-medium text-slate-400">
          (Optional)
        </span>
      </label>

      {description && (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}

      <input
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        className="mt-3 block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-green-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
      />

      {files.length > 0 && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-green-800">
              Selected Documents
            </p>

            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-green-100 bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="break-all text-xs font-semibold text-slate-800">
                    {file.name}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                  className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {fileError && (
        <p
          className="mt-2 text-xs font-medium text-red-600"
          role="alert"
        >
          {fileError}
        </p>
      )}
    </div>
  );
}
/* =========================================================
   REVIEW COMPONENTS
========================================================= */

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
        <h4 className="text-sm font-extrabold text-slate-900">
          {title}
        </h4>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || 'Not provided'}
      </p>
    </div>
  );
}

/* =========================================================
   CONFIRMATION COMPONENT
========================================================= */

function ConfirmationItem({
  label,
  value,
  status = false,
}: {
  label: string;
  value: string;
  status?: boolean;
}) {
  const statusClass =
    value === 'Approved'
      ? 'bg-green-100 text-green-700'
      : value === 'Rejected' ||
        value === 'Payment Rejected'
      ? 'bg-red-100 text-red-700'
      : value.includes('Awaiting')
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-slate-100 text-slate-700';

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {status ? (
        <span
          className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}
        >
          {value}
        </span>
      ) : (
        <p className="mt-1 break-words text-sm font-semibold text-slate-900">
          {value || 'Not available'}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   PAYMENT DETAIL
========================================================= */

function PaymentDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="break-all text-right text-sm font-extrabold text-slate-900">
        {value}
      </span>
    </div>
  );
}

/* =========================================================
   ALERT
========================================================= */

function Alert({
  type,
  children,
}: {
  type: 'error' | 'success';
  children: ReactNode;
}) {
  return (
    <div
      className={`mt-4 rounded-xl border p-4 ${
        type === 'error'
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-green-200 bg-green-50 text-green-700'
      }`}
      role="alert"
    >
      <p className="text-sm font-semibold">
        {children}
      </p>
    </div>
  );
}

/* =========================================================
   APPLICATION FEE NOTICE
========================================================= */

function FeeNotice() {
  return (
    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500 text-xs font-extrabold text-slate-900">
          KSh
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-700">
            Application Fee
          </p>

          <p className="mt-1 text-xl font-extrabold text-slate-900">
            KSh {APPLICATION_FEE.toLocaleString()}
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            The application record will be saved first.
            You must then pay the application fee and
            submit your M-Pesa transaction details for
            administrator verification. Your application
            will proceed after payment approval.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                PayBill
              </p>

              <p className="mt-1 text-lg font-extrabold text-slate-900">
                {MPESA_PAYBILL}
              </p>
            </div>

            <div className="rounded-xl bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Account Number
              </p>

              <p className="mt-1 break-all text-sm font-extrabold text-green-700">
                {MPESA_ACCOUNT}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
