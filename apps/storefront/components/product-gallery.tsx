"use client";

import { useCallback, useState, useSyncExternalStore, type SyntheticEvent } from "react";
import { fitFor, SQUARE_TOLERANCE, type ImageFit } from "@/lib/image-fit";
import { Icon } from "./icon";

/**
 * Runs while the server HTML is parsed, before hydration, so photos don't wait for JavaScript to
 * learn their fit. Same rule as fitFor(); React takes over on hydration.
 */
const EARLY_FIT = `(function(){var s=document.currentScript,r=s&&s.parentNode;if(!r)return;function f(i){var w=i.naturalWidth,h=i.naturalHeight;i.setAttribute("data-fit",w>0&&h>0&&Math.max(w,h)/Math.min(w,h)<=${1 + SQUARE_TOLERANCE + 1e-9}?"cover":"contain")}r.querySelectorAll('img[data-fit="pending"]').forEach(function(i){if(i.complete)f(i);else{i.addEventListener("load",function(){f(i)},{once:true});i.addEventListener("error",function(){f(i)},{once:true})}})})()`;

/** No store to subscribe to: the snapshot only differs between server and client. */
const subscribe = () => () => undefined;
/** True only while hydrating server HTML; false for client-side renders. */
function useHydrating() {
  return useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  );
}

export interface GalleryImage {
  url: string;
  alt: string;
}

/**
 * Thumbnails, main stage, arrows, counter and zoom, as in the design. Only real photos are shown
 * (the jar still-life stands in when there are none); with a single photo the thumbnails, arrows,
 * counter and dots are hidden.
 *
 * Square photos (within 5 %) fill their frame; other shapes are shown whole on the field
 * background. The shape is read from the image's natural size on load. Every frame is a fixed
 * aspect ratio, so nothing reflows; the image stays transparent until its fit is known.
 */
export function ProductGallery({ name, images }: { name: string; images: GalleryImage[] }) {
  const slides: GalleryImage[] =
    images.length > 0 ? images : [{ url: "/jar.svg", alt: `${name} jar, front` }];
  const many = slides.length > 1;
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [m, setM] = useState(0);
  const [fits, setFits] = useState<Record<string, ImageFit>>({});
  const cur = slides[i] ?? slides[0];
  const go = (d: number) => {
    setI((n) => (n + d + slides.length) % slides.length);
    setZoom(false);
  };

  const learn = useCallback((img: HTMLImageElement | null) => {
    // A broken image is complete with no size: fitFor() shows it contained.
    if (!img?.complete) return;
    const url = img.getAttribute("src");
    if (!url) return;
    const fit = fitFor(img.naturalWidth, img.naturalHeight);
    setFits((f) => (f[url] === fit ? f : { ...f, [url]: fit }));
  }, []);
  /** Image props shared by every frame: the fit class, and learning the fit on load. */
  const fitProps = (url: string) => ({
    src: url,
    ref: learn,
    onLoad: (e: SyntheticEvent<HTMLImageElement>) => learn(e.currentTarget),
    onError: (e: SyntheticEvent<HTMLImageElement>) => learn(e.currentTarget),
    "data-fit": fits[url] ?? "pending",
    // EARLY_FIT may already have set data-fit before hydration.
    suppressHydrationWarning: true,
  });
  const hydrating = useHydrating();

  return (
    <>
      {/* Without JavaScript the fit is never learned: show the images contained. */}
      <noscript>
        <style>{`.page-product img[data-fit="pending"]{opacity:1}`}</style>
      </noscript>
      <div className={`gwrap ${many ? "" : "single"}`}>
        {many ? (
          <div className="thumbs" role="group" aria-label="Product photos">
            {slides.map((s, n) => (
              <button
                key={n}
                type="button"
                className={`tn ${n === i ? "on" : ""}`}
                aria-label={`Photo ${n + 1}`}
                aria-current={n === i}
                onClick={() => {
                  setI(n);
                  setZoom(false);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- product art */}
                <img {...fitProps(s.url)} alt="" />
              </button>
            ))}
          </div>
        ) : null}
        <div>
          <div className={`gal-main ${zoom ? "zoomed" : ""}`}>
            {cur ? (
              // eslint-disable-next-line @next/next/no-img-element -- product art
              <img
                key={cur.url}
                className="jarimg"
                {...fitProps(cur.url)}
                alt={cur.alt || `${name} jar`}
                onClick={() => setZoom((z) => !z)}
              />
            ) : null}
            {many ? (
              <>
                <button
                  type="button"
                  className="gbtn p"
                  aria-label="Previous photo"
                  onClick={() => go(-1)}
                >
                  <Icon name="arrow" />
                </button>
                <button
                  type="button"
                  className="gbtn n"
                  aria-label="Next photo"
                  onClick={() => go(1)}
                >
                  <Icon name="arrow" />
                </button>
                <span className="cnt-pill" aria-live="polite">
                  {i + 1} / {slides.length}
                </span>
              </>
            ) : null}
            <button
              type="button"
              className="zbtn"
              aria-pressed={zoom}
              onClick={() => setZoom((z) => !z)}
              lang="bn"
            >
              {zoom ? "ছোট করুন" : "বড় করে দেখুন"}
            </button>
          </div>
        </div>
      </div>
      {/* Phone board (ProductMobile): full-width swipe track with a counter and dots, no arrows or thumbnails. */}
      <div className="gwrapm">
        <div
          className="gtrack"
          role="group"
          aria-label={many ? "Product photos, swipe to browse" : "Product photo"}
          onScroll={(e) =>
            setM(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))
          }
        >
          {slides.map((s, n) => (
            <div key={n} className="gsl">
              {/* eslint-disable-next-line @next/next/no-img-element -- product art */}
              <img {...fitProps(s.url)} alt={s.alt || `${name} jar`} />
            </div>
          ))}
        </div>
        {many ? (
          <span className="cnt-pill" aria-live="polite">
            {m + 1} / {slides.length}
          </span>
        ) : null}
      </div>
      {many ? (
        <div className="dots" aria-hidden="true">
          {slides.map((_, n) => (
            <i key={n} className={n === m ? "on" : undefined} />
          ))}
        </div>
      ) : null}
      {hydrating ? <script dangerouslySetInnerHTML={{ __html: EARLY_FIT }} /> : null}
    </>
  );
}
