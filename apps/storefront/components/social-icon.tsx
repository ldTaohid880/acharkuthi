import type { SocialNetwork } from "@/lib/social";

const svg = { viewBox: "0 0 24 24", "aria-hidden": true } as const;
const line = {
  ...svg,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinejoin: "round",
} as const;

/** Brand marks for the official profiles (footer and Contact), sized by the caller's CSS. */
export function SocialIcon({ name }: { name: SocialNetwork | "whatsapp" }) {
  switch (name) {
    case "facebook":
      return (
        <svg {...svg} fill="currentColor">
          <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.5H8v3h2.6V21h2.9z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...line}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...svg} fill="currentColor">
          <path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.9c-1.4.1-2.7-.3-3.9-1.1v5.6c0 3.4-2.5 5.8-5.6 5.8a5.5 5.5 0 0 1-5.5-5.5c0-3.3 2.9-5.9 6.6-5.4v3c-1.7-.4-3.5.6-3.5 2.4 0 1.5 1.1 2.6 2.6 2.6 1.6 0 2.6-1.1 2.6-2.9V3h2.8z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...line}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
          <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...line}>
          <path d="M3.5 20.5l1.2-3.9A8.5 8.5 0 1 1 8 19.3l-4.5 1.2z" />
          <path d="M9.2 8.6c.2-.4.5-.4.7-.1l.8 1.4c.1.2.1.4-.1.6l-.5.5c.6 1.2 1.5 2.1 2.7 2.7l.5-.5c.2-.2.4-.2.6-.1l1.4.8c.3.2.3.5-.1.7-.5.5-1.2.8-2 .4-2.3-1.1-3.7-2.5-4.6-4.7-.2-.6 0-1.1.1-1.4z" />
        </svg>
      );
  }
}
