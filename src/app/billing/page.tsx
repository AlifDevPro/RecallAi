import type { Metadata } from "next";
import { BillingView } from "./BillingView";

export const metadata: Metadata = {
  title: "Billing & Plans — Recall AI",
  description: "Manage your subscription and view invoices.",
};

export default function Page() {
  return <BillingView />;
}
