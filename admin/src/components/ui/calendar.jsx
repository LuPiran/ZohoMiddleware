import * as React from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { cn } from "@/lib/utils";

/**
 * Calendar no padrão shadcn/ui (react-day-picker), temado TegraPharma.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-white p-3 [--cell-size:2.35rem]",
        className,
      )}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        month_caption: cn(
          "flex h-10 w-full items-center justify-center px-10",
          defaultClassNames.month_caption,
        ),
        caption_label: cn(
          "select-none text-sm font-semibold capitalize text-tegra-blue-dark",
          defaultClassNames.caption_label,
        ),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          "inline-flex size-8 items-center justify-center rounded-xl border border-tegra-blue-dark/10 bg-white text-tegra-blue-dark transition hover:border-tegra-blue-dark/20 hover:bg-tegra-gray-light disabled:opacity-40 cursor-pointer",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "inline-flex size-8 items-center justify-center rounded-xl border border-tegra-blue-dark/10 bg-white text-tegra-blue-dark transition hover:border-tegra-blue-dark/20 hover:bg-tegra-gray-light disabled:opacity-40 cursor-pointer",
          defaultClassNames.button_next,
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 select-none rounded-md text-center text-[0.72rem] font-semibold uppercase tracking-wide text-tegra-blue-dark/45",
          defaultClassNames.weekday,
        ),
        week: cn("mt-1.5 flex w-full", defaultClassNames.week),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center",
          defaultClassNames.day,
        ),
        today: cn(
          "rounded-xl bg-tegra-bg-accent text-tegra-blue-dark",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-tegra-text-light opacity-60",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-tegra-text-light opacity-40",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          const Icon = orientation === "left" ? MdChevronLeft : MdChevronRight;
          return (
            <Icon
              className={cn("size-5", chevronClassName)}
              {...chevronProps}
            />
          );
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({ className, day, modifiers, ...props }) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString("pt-BR")}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
          ? "true"
          : undefined
      }
      className={cn(
        "flex aspect-square size-full min-w-[--cell-size] items-center justify-center rounded-xl text-sm font-medium text-tegra-text-primary transition cursor-pointer",
        "hover:bg-tegra-blue/20 hover:text-tegra-blue-dark",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tegra-blue-green/40",
        "data-[selected-single=true]:bg-tegra-blue-dark data-[selected-single=true]:text-white data-[selected-single=true]:shadow-[0_8px_18px_rgba(26,47,91,0.28)] data-[selected-single=true]:hover:bg-tegra-blue-dark",
        modifiers.today &&
          !modifiers.selected &&
          "font-bold text-tegra-blue-dark ring-1 ring-inset ring-tegra-blue/50",
        modifiers.outside && "text-tegra-text-light",
        modifiers.disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
