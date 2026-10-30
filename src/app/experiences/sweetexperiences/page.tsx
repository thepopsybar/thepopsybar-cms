import type { Metadata } from "next";
import ExperienceCategoryPage from "@/components/ExperienceCategoryPage";
import { experienceCategories } from "@/lib/experience-categories";

export const metadata: Metadata = {
  title: "Sweet Experiences | The Popsy Bar",
  description: "Explore sweet event experiences including cr\u00eapes, mini pancakes, churros, gelato, sundaes and popsicles.",
};

export default function Page() {
  return <ExperienceCategoryPage category={experienceCategories["sweetexperiences"]} />;
}
