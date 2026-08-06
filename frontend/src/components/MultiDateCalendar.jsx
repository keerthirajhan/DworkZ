import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const toDateKey = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

/**
 * Self-contained multi-date-select calendar (no external date-picker
 * dependency — built to match this app's existing design tokens rather
 * than pulling in a library with its own CSS to override).
 *
 * - Click a date to select it, click again to deselect.
 * - No restriction on dates being consecutive.
 * - Staff can navigate months freely; selections persist across months
 *   (state lives in the parent's `selectedDates`, this component only
 *   renders whichever month is currently in view), so multi-month
 *   selection works with no extra plumbing.
 * - Fully keyboard accessible — every day is a real <button>, so Tab +
 *   Enter/Space works natively with no custom key handling needed.
 *
 * @param {string[]} selectedDates - 'YYYY-MM-DD' strings
 * @param {(dates: string[]) => void} onChange
 */
const MultiDateCalendar = ({ selectedDates = [], onChange }) => {
  const initialMonth = selectedDates.length > 0
    ? new Date(selectedDates[selectedDates.length - 1])
    : new Date();

  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());

  const selectedSet = new Set(selectedDates);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const toggleDate = (dateKey) => {
    if (selectedSet.has(dateKey)) {
      onChange(selectedDates.filter(d => d !== dateKey));
    } else {
      onChange([...selectedDates, dateKey].sort());
    }
  };

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const todayKey = toDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-background border border-borderSubtle rounded-2xl p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={goToPrevMonth} aria-label="Previous month"
          className="p-2 rounded-xl text-textMuted hover:text-textMain hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40">
          <ChevronLeft size={16} />
        </button>
        <p className="text-xs font-black text-textMain uppercase tracking-widest">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </p>
        <button type="button" onClick={goToNextMonth} aria-label="Next month"
          className="p-2 rounded-xl text-textMuted hover:text-textMain hover:bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[9px] font-black text-textMuted uppercase py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`blank-${idx}`} />;
          const dateKey = toDateKey(viewYear, viewMonth, day);
          const isSelected = selectedSet.has(dateKey);
          const isToday = dateKey === todayKey;
          return (
            <button
              type="button"
              key={dateKey}
              onClick={() => toggleDate(dateKey)}
              aria-pressed={isSelected}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${MONTH_NAMES[viewMonth]} ${day}, ${viewYear}`}
              className={`aspect-square rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary/50
                ${isSelected
                  ? 'bg-primary text-white shadow-md shadow-primary/30 scale-105'
                  : isToday
                    ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                    : 'text-textMain hover:bg-surface border border-transparent hover:border-borderSubtle'
                }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MultiDateCalendar;
