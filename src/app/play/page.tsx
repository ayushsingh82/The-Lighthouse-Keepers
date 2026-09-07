import type { Metadata } from "next";
import { LighthouseGame } from "@/components/lighthouse/LighthouseGame";

export const metadata: Metadata = {
  title: "Keep the light — The Lighthouse Keepers",
};

export default function PlayPage() {
  return <LighthouseGame />;
}
