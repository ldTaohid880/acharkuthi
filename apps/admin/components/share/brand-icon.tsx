import { BRAND_PATHS } from "./brand-paths";

export const SHARE_APPS = [
  "whatsapp",
  "facebook",
  "messenger",
  "telegram",
  "x",
  "linkedin",
  "discord",
  "slack",
  "imessage",
] as const;
export type ShareApp = (typeof SHARE_APPS)[number];

export const APP_NAME: Record<ShareApp, string> = {
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  messenger: "Messenger",
  telegram: "Telegram",
  x: "X",
  linkedin: "LinkedIn",
  discord: "Discord",
  slack: "Slack",
  imessage: "iMessage",
};

/** The app's mark, only to label which app a preview imitates. `mono` draws it in currentColor. */
export function BrandIcon({
  app,
  size = 16,
  mono = false,
}: {
  app: ShareApp;
  size?: number;
  mono?: boolean;
}) {
  if (app === "linkedin")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="flex-none">
        <rect width="24" height="24" rx="4" fill={mono ? "currentColor" : "#0A66C2"} />
        <path
          fill="#fff"
          d="M7.1 9.5h-3v10h3zm-1.5-1.4a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4M20 13.9c0-2.9-1.6-4.6-4-4.6-1.3 0-2.2.7-2.6 1.4V9.5h-2.9v10h3v-5.2c0-1.4.6-2.3 1.8-2.3s1.7.9 1.7 2.3v5.2h3z"
        />
      </svg>
    );
  if (app === "slack")
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="flex-none">
        <rect
          x="9.5"
          y="2"
          width="3.2"
          height="9"
          rx="1.6"
          fill={mono ? "currentColor" : "#36C5F0"}
        />
        <rect
          x="2"
          y="9.5"
          width="9"
          height="3.2"
          rx="1.6"
          fill={mono ? "currentColor" : "#2EB67D"}
        />
        <rect
          x="11.3"
          y="13"
          width="3.2"
          height="9"
          rx="1.6"
          fill={mono ? "currentColor" : "#ECB22E"}
        />
        <rect
          x="13"
          y="11.3"
          width="9"
          height="3.2"
          rx="1.6"
          fill={mono ? "currentColor" : "#E01E5A"}
        />
      </svg>
    );
  const b = BRAND_PATHS[app];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="flex-none">
      <path d={b.d} fill={mono ? "currentColor" : b.color} />
    </svg>
  );
}
