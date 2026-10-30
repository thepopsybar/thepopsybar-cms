import type { Metadata } from "next";
import ExperienceCategoryPage from "@/components/ExperienceCategoryPage";
import { experienceCategories } from "@/lib/experience-categories";

export const metadata: Metadata = {
  title: "Coffee & Beverage | The Popsy Bar",
  description: "Explore coffee, espresso, matcha, specialty drinks, milk tea and tapioca boba experiences for your event.",
};

export default function Page() {
  return <ExperienceCategoryPage category={experienceCategories["coffee-beverage"]} />;
}
