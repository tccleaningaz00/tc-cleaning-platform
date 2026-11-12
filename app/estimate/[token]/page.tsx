import type { Metadata } from "next";
import PublicEstimate from "../../components/public-estimate";

export const metadata: Metadata = {
  title: "Your TC Cleaning Estimate",
  robots: { index: false, follow: false },
};

export default async function EstimateApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicEstimate token={token} />;
}
