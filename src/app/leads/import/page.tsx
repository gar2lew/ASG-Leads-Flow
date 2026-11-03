"use client";

// Thin wrapper — the form itself lives in src/components/survey-import.tsx so it
// can also render as the embedded "Leads Import" tab on the Leads page.

import SurveyImportForm from "@/components/survey-import";

export default function LeadImportPage() {
  return <SurveyImportForm />;
}
