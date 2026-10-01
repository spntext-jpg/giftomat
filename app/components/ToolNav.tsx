import type { ToolMode } from "../lib/presets";
import ToolIcon from "./ToolIcon";

interface ToolNavProps {
  activeTool: ToolMode;
  disabled: boolean;
  open: boolean;
  onSelect: (tool: ToolMode) => void;
}

const TOOLS: Array<{ id: ToolMode; title: string; note: string; label: string }> = [
  { id: "gif", title: "GIF", note: "Анимация", label: "GIF — Анимация" },
  { id: "pdf", title: "PDF", note: "Карусель", label: "PDF — Карусель" },
  { id: "compress", title: "Сжатие", note: "JPG · WebP", label: "Сжатие — JPG и WebP" },
  { id: "crop", title: "Обрезка", note: "Точный размер", label: "Обрезка — Точный размер" },
  { id: "html2pdf", title: "HTML → PDF", note: "Сохранение вёрстки", label: "HTML в PDF — Сохранение вёрстки" },
];

export default function ToolNav({ activeTool, disabled, open, onSelect }: ToolNavProps) {
  return (
    <aside
      id="giftomat-tool-nav"
      className={`tool-sidebar glass-panel giftomat-nav ${open ? "open" : ""}`}
      aria-label="Инструменты"
    >
      {TOOLS.map((tool) => {
        const active = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            className={`tool-button giftomat-nav-button ${active ? "active" : ""}`}
            onClick={() => onSelect(tool.id)}
            aria-current={active ? "page" : undefined}
            aria-label={tool.label}
            disabled={disabled}
          >
            <span className="tool-icon giftomat-nav-icon" aria-hidden="true">
              <ToolIcon name={tool.id} />
            </span>
            <div className="giftomat-nav-copy">
              <div className="giftomat-nav-title">{tool.title}</div>
              <div className="giftomat-nav-note">{tool.note}</div>
            </div>
          </button>
        );
      })}
    </aside>
  );
}
