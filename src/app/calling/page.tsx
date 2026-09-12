// ============================================
// ASG Leads — Calling Page
// ============================================

import { Metadata } from "next";
import { CallingClient } from "./CallingClient";

export const metadata: Metadata = {
  title: "Call Queue | ASG Leads",
};

export default function CallingPage() {
  return <CallingClient />;
}