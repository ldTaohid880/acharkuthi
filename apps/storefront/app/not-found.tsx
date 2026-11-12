import { html } from "@/content/not-found";
import { html as htmlMobile } from "@/content/not-found-mobile";

/** The design's 404. Desktop and phone markup differ, so both render and CSS shows one. */
export default function NotFound() {
  return (
    <div className="page-notfound">
      <main className="er-main">
        <div className="nf-desk" dangerouslySetInnerHTML={{ __html: html }} />
        <div className="nf-mob" dangerouslySetInnerHTML={{ __html: htmlMobile }} />
      </main>
    </div>
  );
}
