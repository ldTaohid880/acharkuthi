import { cn } from "@repo/ui/lib/utils";
import { BrandIcon, type ShareApp } from "./brand-icon";
import s from "./previews.module.css";

export interface PreviewData {
  /** The card image: a URL plus the focal point it is cropped around (CSS background-position). */
  image: { url: string; focal: { x: number; y: number } };
  title: string;
  description: string;
  /** Full public URL, e.g. https://acharkuthi.store/pickles/nobabi-lassi */
  url: string;
  siteName: string;
}

const domainOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/**
 * How one app shows the shared link (approximate). Pure markup, no judgement: the person
 * editing sees exactly this while typing and decides for themselves.
 */
export function AppPreview({ app, d }: { app: ShareApp; d: PreviewData }) {
  const domain = domainOf(d.url);
  const bg = {
    backgroundImage: `url("${d.image.url}")`,
    backgroundPosition: `${d.image.focal.x * 100}% ${d.image.focal.y * 100}%`,
  };
  const img = (ratio: string | undefined, extra?: string) => (
    <div className={cn(s.img, ratio, extra)} style={bg} role="img" aria-label={d.title} />
  );

  switch (app) {
    case "whatsapp":
      return (
        <div className={s.waChat}>
          <div className={s.waBubble}>
            <div className={s.waCard}>
              {img(s.wide)}
              <div className={s.waText}>
                <div className={cn(s.waTitle, s.clamp2)}>{d.title}</div>
                {d.description ? (
                  <div className={cn(s.waDesc, s.clamp2)}>{d.description}</div>
                ) : null}
                <div className={s.waDomain}>{domain}</div>
              </div>
            </div>
            <div className={s.waLink}>{d.url}</div>
            <div className={s.waTime}>10:24 ✓✓</div>
          </div>
        </div>
      );
    case "facebook":
      return (
        <div className={s.fb}>
          <div className={s.fbPost}>
            <div className={s.fbAvatar}>আ</div>
            <div>
              <div className="text-[15px] font-semibold">{d.siteName}</div>
              <div className="text-[13px] text-[#65676b]">Just now · 🌐</div>
            </div>
          </div>
          {img(s.fbRatio)}
          <div className={s.fbText}>
            <div className={s.fbDomain}>{domain}</div>
            <div className={cn(s.fbTitle, s.clamp1)}>{d.title}</div>
            {d.description ? <div className={cn(s.fbDesc, s.clamp1)}>{d.description}</div> : null}
          </div>
        </div>
      );
    case "messenger":
      return (
        <div className={s.plainChat}>
          <div className={s.msBubble}>
            {img(s.fbRatio)}
            <div className={s.bubbleText}>
              <div className={cn(s.bubbleTitle, s.clamp2)}>{d.title}</div>
              <div className={s.bubbleDomain}>{domain}</div>
            </div>
          </div>
        </div>
      );
    case "telegram":
      return (
        <div className={s.tgChat}>
          <div className={s.tgBubble}>
            <div className="break-all text-[#168acd]">{d.url}</div>
            <div className={s.tgQuote}>
              <div className={s.tgSite}>{d.siteName}</div>
              <div className="font-semibold">{d.title}</div>
              {d.description ? <div className={cn(s.tgDesc, s.clamp3)}>{d.description}</div> : null}
              {img(s.wide, s.tgImg)}
            </div>
            <div className="text-right text-[11px] text-[#5ea65d]">10:24 ✓✓</div>
          </div>
        </div>
      );
    case "x":
      return (
        <div>
          <div className={cn(s.img, s.fbRatio, s.xCard)} style={bg} role="img" aria-label={d.title}>
            <span className={s.xLabel}>{d.title}</span>
          </div>
          <div className={s.xFrom}>From {domain}</div>
        </div>
      );
    case "linkedin":
      return (
        <div className={s.lk}>
          {img(s.fbRatio)}
          <div className={s.lkText}>
            <div className={cn(s.lkTitle, s.clamp2)}>{d.title}</div>
            <div className={s.lkDomain}>{domain}</div>
          </div>
        </div>
      );
    case "discord":
      return (
        <div className={s.dc}>
          <div className={s.dcEmbed}>
            <div className={s.dcSite}>{d.siteName}</div>
            <div className={s.dcTitle}>{d.title}</div>
            {d.description ? <div className={s.dcDesc}>{d.description}</div> : null}
            {img(s.wide, s.dcImg)}
          </div>
        </div>
      );
    case "slack":
      return (
        <div className={s.sl}>
          <div className={s.slAttach}>
            <div className={s.slSite}>
              <BrandIcon app="slack" size={14} />
              {d.siteName}
            </div>
            <div className={s.slTitle}>{d.title}</div>
            {d.description ? <div className={s.clamp2}>{d.description}</div> : null}
            {img(s.wide, s.slImg)}
          </div>
        </div>
      );
    case "imessage":
      return (
        <div className={s.plainChat}>
          <div className={s.imBubble}>
            {img(s.fbRatio)}
            <div className={s.bubbleText}>
              <div className={cn(s.bubbleTitle, s.clamp2)}>{d.title}</div>
              <div className="text-[12px] text-[#8a8a8e]">{domain}</div>
            </div>
          </div>
        </div>
      );
  }
}
