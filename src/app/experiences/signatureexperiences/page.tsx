import type { Metadata } from "next";
import ExperienceCategoryPage from "@/components/ExperienceCategoryPage";
import { experienceCategories } from "@/lib/experience-categories";

export const metadata: Metadata = {
  title: "Signature Experiences | The Popsy Bar",
  description: "Explore The Popsy Bar signature experiences: Perfume Bar, Oud Bar, Flower Station and Lip Bar.",
};

export default function Page() {
  return <ExperienceCategoryPage category={experienceCategories["signatureexperiences"]} />;
}
