'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { format, isValid, parse } from 'date-fns';
import { DayPicker, DateRange } from 'react-day-picker';

export function MyCalendar() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const dialogId = useId();
    const headerId = useId();

    // Hold the month in state to control the calendar when the input changes
    const [month, setMonth] = useState(new Date());
    // Hold the selected range in state
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined);
    // Hold the input value in state
    const [inputValue, setInputValue] = useState('');
    // Hold the dialog visibility in state
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Function to toggle the dialog visibility
    const toggleDialog = () => setIsDialogOpen(!isDialogOpen);

    // Hook to handle the body scroll behavior and focus trapping
    useEffect(() => {
        const handleBodyScroll = (isOpen: boolean) => {
            document.body.style.overflow = isOpen ? 'hidden' : '';
        };
        if (!dialogRef.current) return;
        if (isDialogOpen) {
            handleBodyScroll(true);
            dialogRef.current.showModal();
        } else {
            handleBodyScroll(false);
            dialogRef.current.close();
        }
        return () => {
            handleBodyScroll(false);
        };
    }, [isDialogOpen]);

    const handleDayPickerSelect = (range: DateRange | undefined) => {
        setSelectedRange(range);
        if (range?.from && range?.to) {
            setInputValue(
                `${format(range.from, 'MM/dd/yyyy')} - ${format(range.to, 'MM/dd/yyyy')}`
            );
        } else if (range?.from) {
            setInputValue(format(range.from, 'MM/dd/yyyy'));
        } else {
            setInputValue('');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        // Optionally, parse and set range from input
    };

    const handleClear = () => {
        setSelectedRange(undefined);
        setInputValue('');
    };

    const handleDone = () => {
        // setIsDialogOpen(false);
        toggleDialog();
        //
        // if (dialogRef.current && dialogRef.current.open) dialogRef.current.close();
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginTop: '2rem',
            }}
        >
            <label htmlFor="date-input" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                <strong>Date Range: </strong>
            </label>
            <input
                style={{
                    fontSize: '1.1rem',
                    padding: '0.5rem 1rem',
                    minWidth: '220px',
                    marginBottom: '0.5rem',
                }}
                id="date-input"
                type="text"
                value={inputValue}
                placeholder="MM/dd/yyyy - MM/dd/yyyy"
                onChange={handleInputChange}
            />{' '}
            <button
                style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', marginBottom: '1rem' }}
                onClick={toggleDialog}
                aria-controls="dialog"
                aria-haspopup="dialog"
                aria-expanded={isDialogOpen}
                aria-label="Open calendar to choose booking date"
            >
                📆
            </button>
            <p
                aria-live="assertive"
                aria-atomic="true"
                style={{ fontSize: '1rem', marginBottom: '1rem' }}
            >
                {selectedRange?.from && selectedRange?.to
                    ? `${selectedRange.from.toDateString()} - ${selectedRange.to.toDateString()}`
                    : 'Please pick a date range'}
            </p>
            <dialog
                role="dialog"
                ref={dialogRef}
                id={dialogId}
                aria-modal
                aria-labelledby={headerId}
                onClose={() => setIsDialogOpen(false)}
                // Close dialog when clicking backdrop
                onClick={e => {
                    // if (e.target === e.currentTarget) setIsDialogOpen(false);
                    if (e.target === e.currentTarget) toggleDialog();
                }}
                style={{
                    padding: '2rem',
                    borderRadius: '12px',
                    boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
                    fontSize: '1.1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <DayPicker
                    month={month}
                    onMonthChange={setMonth}
                    autoFocus
                    mode="range"
                    selected={selectedRange}
                    onSelect={handleDayPickerSelect}
                    numberOfMonths={1}
                    formatters={{
                        formatWeekdayName: day => format(day, 'ccc'),
                    }}
                    classNames={{
                        caption: 'custom-caption',
                        day: 'custom-day-spacing',
                        day_button: 'custom-day-spacing',
                        head_cell: 'custom-day-spacing',
                        selected: 'custom-selected-day',
                        nav: 'custom-nav',
                        nav_button_next: 'custom-nav-button',
                        nav_button_previous: 'custom-nav-button',
                    }}
                />
                <style>{`
          .custom-caption {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 0.5rem;
          }
          .custom-day-spacing {
            min-width: 36px;
            min-height: 36px;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
          }
          .custom-selected-day {
            background: #83b6ff;
            color: white;
            border-radius: 6px;
            font-weight: bold;
            box-shadow: 0 0 0 2px #83b6ff33;
          }
          .custom-nav {
            position: absolute;
            min-height: 36px;
            right: 1.9rem;
            top: 1.7rem;
            display: flex; 
            // gap: 0.5rem;
            align-items: center;
            color:rgb(36, 99, 195);
          }
          .custom-nav-button {
            background: none;
            border: none;
            color:rgb(97, 109, 127);
            font-size: 0.9rem;
            cursor: pointer;
            // padding: 0.2rem 0.5rem;
            // border-radius: 50%;
            transition: background 0.2s;
          }
            .custom-nav-button svg {
              fill:rgb(121, 135, 156) !important;
          }
        //   .custom-nav-button:hover {
        //     background: #e6f0fa;
        //   }
        `}</style>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '1rem',
                        marginTop: '1.5rem',
                    }}
                >
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            background: '#eee',
                            border: 'none',
                            padding: '0.5rem 1.2rem',
                            borderRadius: '4px',
                            fontSize: '1rem',
                        }}
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        onClick={handleDone}
                        style={{
                            background: '#83b6ff',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1.2rem',
                            borderRadius: '4px',
                            fontSize: '1rem',
                        }}
                    >
                        Done
                    </button>
                </div>
            </dialog>
        </div>
    );
}
