import { Metadata } from "next";
import { LeadsClient } from "./LeadsClient";

export const metadata: Metadata = {
  title: "Leads | ASG Leads",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const view = resolvedSearchParams.view as string | undefined;
  const status = resolvedSearchParams.status as string | undefined;

  return <LeadsClient initialView={view} initialStatus={status} />;
}