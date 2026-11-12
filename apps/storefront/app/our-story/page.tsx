import type { Metadata } from "next";
import { html } from "@/content/story";
import { html as htmlMobile } from "@/content/story-mobile";

export const metadata: Metadata = {
  title: "Our story",
  description:
    "Sun-dried mango, mustard oil and the moment a jar is opened. The story of Acharkuthi.",
};

/** Desktop and phone layouts differ in markup in the design, so both render and CSS shows one. */
export default function OurStoryPage() {
  return (
    <div className="page-story">
      <main>
        <div className="story-desk" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="story-mob" dangerouslySetInnerHTML={{ __html: htmlMobile }} />
      </main>
    </div>
  );
}
