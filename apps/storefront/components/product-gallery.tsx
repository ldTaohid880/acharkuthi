"use client";

import { useCallback, useState, useSyncExternalStore, type SyntheticEvent } from "react";
import { fitFor, SQUARE_TOLERANCE, type ImageFit } from "@/lib/image-fit";
import { useLang } from "@/lib/i18n/lang-context";
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
  /** Known from the stored pixel size (admin saves it): the photo is shown at once in this fit. */
  fit?: ImageFit | undefined;
}

/** The jar still-life stand-in (public/jar.svg, 220 × 300): always shown whole. */
const JAR: GalleryImage = { url: "/jar.svg", alt: "", fit: fitFor(220, 300) };

/**
 * Thumbnails, main stage and arrows. Owner (2026-11-22): no zoom and no photo counter; the page
 * leaves out the photo flagged for Home's picks. Only real photos are shown (the jar still-life stands in when there are none); with a single photo the
 * thumbnails, arrows and dots are hidden.
 *
 * Square photos (within 5 %) fill their frame; other shapes are shown whole on the field
 * background. The shape comes from the stored pixel size when admin saved one (so the photo shows
 * at once), else from the image's natural size on load; the loaded size always wins. Every frame
 * is a fixed aspect ratio, so nothing reflows; an image stays transparent only while its fit is
 * still unknown.
 */
export function ProductGallery({ name, images }: { name: string; images: GalleryImage[] }) {
  const slides: GalleryImage[] =
    images.length > 0 ? images : [{ ...JAR, alt: `${name} jar, front` }];
  /** Fits known before load (stored size); the rest are learned from the loaded image. */
  const known = new Map(slides.flatMap((s) => (s.fit ? [[s.url, s.fit] as const] : [])));
  const many = slides.length > 1;
  const [i, setI] = useState(0);
  const { t: all } = useLang();
  const t = all.gallery;
  const [m, setM] = useState(0);
  const [fits, setFits] = useState<Record<string, ImageFit>>({});
  const cur = slides[i] ?? slides[0];
  const go = (d: number) => {
    setI((n) => (n + d + slides.length) % slides.length);
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
    "data-fit": fits[url] ?? known.get(url) ?? "pending",
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
          <div className="thumbs" role="group" aria-label={t.thumbs}>
            {slides.map((s, n) => (
              <button
                key={n}
                type="button"
                className={`tn ${n === i ? "on" : ""}`}
                aria-label={t.photo(n + 1)}
                aria-current={n === i}
                onClick={() => setI(n)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- product art */}
                <img {...fitProps(s.url)} alt="" />
              </button>
            ))}
          </div>
        ) : null}
        <div>
          <div className="gal-main">
            {cur ? (
              // eslint-disable-next-line @next/next/no-img-element -- product art
              <img
                key={cur.url}
                className="jarimg"
                {...fitProps(cur.url)}
                alt={cur.alt || `${name} jar`}
              />
            ) : null}
            {many ? (
              <>
                <button type="button" className="gbtn p" aria-label={t.prev} onClick={() => go(-1)}>
                  <Icon name="arrow" />
                </button>
                <button type="button" className="gbtn n" aria-label={t.next} onClick={() => go(1)}>
                  <Icon name="arrow" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {/* Phone board (ProductMobile): full-width swipe track with a counter and dots, no arrows or thumbnails. */}
      <div className="gwrapm">
        <div
          className="gtrack"
          role="group"
          aria-label={many ? t.photos : t.one}
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
