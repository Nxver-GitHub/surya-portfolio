import type { Metadata } from "next";
import { GtBackHeader, GtCrumb } from "@/components/gt/GtChrome";
import { CareerPavilion } from "@/components/career/CareerPavilion";

export const metadata: Metadata = {
  title: "Career — Surya Pugazhenthi",
  description:
    "Surya Pugazhenthi's education and work history: Diablo Valley College, UC Santa Cruz, product roles, hackathon wins, and venture scouting — season by season.",
  alternates: { canonical: "/career" },
};

export default function CareerPage() {
  return (
    <div className="console-page relative flex flex-1 flex-col px-5 py-6 md:px-10 md:py-8" data-pavilion="career">
      <GtCrumb label="Career" />

      <GtBackHeader href="/" label="World Map" />

      <main className="flex flex-1 flex-col pb-10">
        <CareerPavilion />
      </main>
    </div>
  );
}
