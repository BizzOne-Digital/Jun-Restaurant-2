import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track order | A Wok",
  description: "Look up the status of your A Wok order with your order number.",
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
