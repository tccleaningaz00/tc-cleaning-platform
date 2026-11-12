import type { Metadata } from "next";
import PublicInvoice from "../../components/public-invoice";

export const metadata: Metadata = {
  title: "Your TC Cleaning Invoice",
  robots: { index: false, follow: false },
};

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicInvoice token={token} />;
}
