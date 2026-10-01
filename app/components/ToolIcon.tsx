import type { ReactNode } from "react";
import type { ToolMode } from "../lib/presets";

export type ToolIconName = ToolMode | "upload" | "download" | "trash" | "privacy" | "left" | "right";

const ICON_PATHS: Record<ToolIconName, ReactNode> = {
  gif: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m9 9 6 3-6 3Z"/></>,
  pdf: <><path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h5"/></>,
  compress: <><path d="m8 3-5 5m0-5v5h5M16 21l5-5m0 5v-5h-5"/><rect x="7" y="7" width="10" height="10" rx="2"/></>,
  crop: <><path d="M7 3v13a5 5 0 0 0 5 5h9"/><path d="M3 7h13a5 5 0 0 1 5 5v9"/><path d="M7 7h10v10H7Z"/></>,
  html2pdf: <><path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5"/><path d="m9.5 12-2 2 2 2M14.5 12l2 2-2 2"/></>,
  upload: <><path d="M12 16V3m0 0L7 8m5-5 5 5"/><path d="M4 15v5h16v-5"/></>,
  download: <><path d="M12 3v13m0 0 5-5m-5 5-5-5"/><path d="M4 19v2h16v-2"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>,
  privacy: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6Z"/><path d="m9 12 2 2 4-4"/></>,
  left: <path d="m15 6-6 6 6 6"/>,
  right: <path d="m9 6 6 6-6 6"/>,
};

export default function ToolIcon({ name }: { name: ToolIconName }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  );
}
