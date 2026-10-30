import type { Metadata } from "next";
import ExperienceCategoryPage from "@/components/ExperienceCategoryPage";
import { experienceCategories } from "@/lib/experience-categories";

export const metadata: Metadata = {
  title: "Mocktail Experiences | The Popsy Bar",
  description: "Explore signature mocktails, popping boba, Jaman Chaanakha, Falsa Mulitli and Sugarcane Glow experiences.",
};

export default function Page() {
  return <ExperienceCategoryPage category={experienceCategories["mocktailexperiences"]} />;
}
