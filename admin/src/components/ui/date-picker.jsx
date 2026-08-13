import { useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MdCalendarMonth, MdClose } from "react-icons/md";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function parseValue(value) {
  if (!value) return undefined;
  try {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function toIsoDate(date) {
  if (!date || !isValid(date)) return "";
  return format(date, "yyyy-MM-dd");
}

/**
 * Date picker no padrão shadcn (Popover + Calendar), visual Tegra.
 * value / onChange usam string `yyyy-MM-dd` (compatível com filtros).
 */
export default function DatePicker({
  label,
  value = "",
  onChange,
  placeholder = "dd/mm/aaaa",
  className = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseValue(value), [value]);

  const display = selected
    ? format(selected, "dd/MM/yyyy", { locale: ptBR })
    : "";

  return (
    <div className={cn("block", className)}>
      {label ? (
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-tegra-blue-dark/55">
          {label}
        </span>
      ) : null}

      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <div className="relative">
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              data-empty={!selected}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border border-tegra-blue-dark/10 bg-gradient-to-br from-white to-[#f4f7fb] px-3 py-2.5 pr-10 text-left text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition",
                "hover:border-tegra-blue-dark/20 focus:border-tegra-blue-green/50 focus:outline-none focus:ring-2 focus:ring-tegra-blue-green/25",
                "disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
                selected
                  ? "font-medium text-tegra-text-primary"
                  : "text-tegra-text-secondary",
              )}
            >
              <MdCalendarMonth
                className="shrink-0 text-lg text-tegra-blue-dark/45"
                aria-hidden
              />
              <span className="truncate">{display || placeholder}</span>
            </button>
          </PopoverTrigger>

          {selected ? (
            <button
              type="button"
              aria-label="Limpar data"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onChange?.("");
                setOpen(false);
              }}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-lg p-1 text-tegra-text-secondary transition hover:bg-tegra-gray-light hover:text-tegra-error cursor-pointer"
            >
              <MdClose className="text-base" />
            </button>
          ) : null}
        </div>

        <PopoverContent align="start" className="overflow-hidden p-0">
          <div className="h-1 w-full bg-gradient-to-r from-tegra-blue via-tegra-blue-green to-tegra-teal" />
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              onChange?.(toIsoDate(date));
              setOpen(false);
            }}
            defaultMonth={selected}
          />
        </PopoverContent>
      </Popover>

      <style>{`
        .tegra-popover-content[data-state="open"] {
          animation: tegraPopoverIn 160ms ease-out;
        }
        .tegra-popover-content[data-state="closed"] {
          animation: tegraPopoverOut 120ms ease-in;
        }
        @keyframes tegraPopoverIn {
          from { opacity: 0; transform: translateY(4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tegraPopoverOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(4px) scale(0.98); }
        }
      `}</style>
    </div>
  );
}
