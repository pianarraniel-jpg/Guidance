"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 sm:p-6", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-y-0 relative",
        month: "space-y-4 w-full",
        month_caption: "flex justify-center pt-1 relative items-center mb-6",
        caption_label: "text-sm font-black uppercase tracking-widest text-slate-900",
        nav: "flex items-center absolute top-0 right-0 left-0",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 border-2 border-slate-200 rounded-xl shadow-sm absolute left-0 hover:bg-slate-50 transition-all"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 border-2 border-slate-200 rounded-xl shadow-sm absolute right-0 hover:bg-slate-50 transition-all"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "grid grid-cols-7 mb-3",
        weekday: "text-slate-400 rounded-md font-black text-[10px] sm:text-xs uppercase tracking-tighter text-center py-2",
        week: "grid grid-cols-7 w-full mt-1",
        day: "h-9 sm:h-10 w-full text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 sm:h-10 w-full p-0 font-bold text-xs sm:text-sm transition-all duration-200 hover:bg-slate-100 rounded-lg"
        ),
        range_end: "day-range-end",
        selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white shadow-lg shadow-primary/20 scale-110 rounded-lg",
        today: "bg-amber-50 text-amber-900 font-extrabold rounded-lg border border-amber-200",
        outside: "text-slate-300 opacity-40",
        disabled: "text-slate-300 opacity-40 cursor-not-allowed line-through",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
          return (
            <Icon
              className="h-4 w-4"
              {...props}
            />
          );
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }