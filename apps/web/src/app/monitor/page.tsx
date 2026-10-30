import type { Metadata } from "next";
import { VisitTracker } from "@/components/consent/VisitTracker";
import { MonitorDashboard } from "@/components/monitor/MonitorDashboard";

export const metadata: Metadata = {
  title: "Monitor",
  description: "Live signals about India, built from news, weather, traffic and official sources.",
  // Still sample data, so keep it out of search for now.
  robots: { index: false, follow: true },
};

// A server component around one client island: the dashboard's data is
// generated in the browser, so nothing here can be prerendered with it.
export default function MonitorPage() {
  return (
    <>
      <MonitorDashboard />
      <VisitTracker />
    </>
  );
}
