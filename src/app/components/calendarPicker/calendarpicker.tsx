// 'use client';
// import { useEffect, useId, useRef, useState } from 'react';
// import { format, isValid, parse } from 'date-fns';
// import { DayPicker, DateRange } from 'react-day-picker';

// export function MyCalendar() {
//     const dialogRef = useRef<HTMLDialogElement>(null);
//     const dialogId = useId();
//     const headerId = useId();

//     // Hold the month in state to control the calendar when the input changes
//     const [month, setMonth] = useState(new Date());
//     // Hold the selected range in state
//     const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined);
//     // Hold the input value in state
//     const [inputValue, setInputValue] = useState('');
//     // Hold the dialog visibility in state
//     const [isDialogOpen, setIsDialogOpen] = useState(false);

//     // Function to toggle the dialog visibility
//     const toggleDialog = () => {
//          console.log('toggleDialog called, current state:', isDialogOpen);
//          setIsDialogOpen(!isDialogOpen);
//     }

//     // Hook to handle the body scroll behavior and focus trapping
//     // useEffect(() => {
//     //     const handleBodyScroll = (isOpen: boolean) => {
//     //         document.body.style.overflow = isOpen ? 'hidden' : '';
//     //     };
//     //     if (!dialogRef.current) return;
//     //     if (isDialogOpen) {
//     //         handleBodyScroll(true);
//     //         dialogRef.current.showModal();
//     //     } else {
//     //         handleBodyScroll(false);
//     //         if (dialogRef.current.open) {
//     //             dialogRef.current.close();
//     //         }
//     //     }
//     //     return () => {
//     //         handleBodyScroll(false);
//     //     };
//     // }, [isDialogOpen]);
//     useEffect(() => {
//         const dialog = dialogRef.current;  // Store ref in variable
//         console.log('useEffect running, isDialogOpen:', isDialogOpen, 'dialog:', dialog);
//         if (!dialog) return;

//         const handleBodyScroll = (isOpen: boolean) => {
//             document.body.style.overflow = isOpen ? 'hidden' : '';
//         };

//         if (isDialogOpen) {
//             console.log('Opening dialog');
//             handleBodyScroll(true);
//             dialog.showModal();
//         } else {
//             console.log('Closing dialog');
//             handleBodyScroll(false);
//             dialog.close();
//         }

//         return () => {
//             handleBodyScroll(false);
//         };
//     }, [isDialogOpen]);

//     const handleDayPickerSelect = (range: DateRange | undefined) => {
//         setSelectedRange(range);
//         if (range?.from && range?.to) {
//             setInputValue(
//                 `${format(range.from, 'MM/dd/yyyy')} - ${format(range.to, 'MM/dd/yyyy')}`
//             );
//         } else if (range?.from) {
//             setInputValue(format(range.from, 'MM/dd/yyyy'));
//         } else {
//             setInputValue('');
//         }
//     };

//     const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setInputValue(e.target.value);
//         // Optionally, parse and set range from input
//     };

//     const handleClear = () => {
//         setSelectedRange(undefined);
//         setInputValue('');
//     };

//     const handleDone = () => {
//         setIsDialogOpen(false);
//     };

//     return (
//         <div
//             style={{
//                 display: 'flex',
//                 flexDirection: 'column',
//                 alignItems: 'center',
//                 marginTop: '2rem',
//             }}
//         >
//             <label htmlFor="date-input" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
//                 <strong>Date Range: </strong>
//             </label>
//             <input
//                 style={{
//                     fontSize: '1.1rem',
//                     padding: '0.5rem 1rem',
//                     minWidth: '220px',
//                     marginBottom: '0.5rem',
//                 }}
//                 id="date-input"
//                 type="text"
//                 value={inputValue}
//                 placeholder="MM/dd/yyyy - MM/dd/yyyy"
//                 onChange={handleInputChange}
//             />{' '}
//             <button
//                 style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', marginBottom: '1rem' }}
//                 onClick={toggleDialog}
//                 aria-controls="dialog"
//                 aria-haspopup="dialog"
//                 aria-expanded={isDialogOpen}
//                 aria-label="Open calendar to choose booking date"
//             >
//                 📆
//             </button>
//             <p
//                 aria-live="assertive"
//                 aria-atomic="true"
//                 style={{ fontSize: '1rem', marginBottom: '1rem' }}
//             >
//                 {selectedRange?.from && selectedRange?.to
//                     ? `${selectedRange.from.toDateString()} - ${selectedRange.to.toDateString()}`
//                     : 'Please pick a date range'}
//             </p>
//             <dialog
//                 role="dialog"
//                 ref={dialogRef}
//                 id={dialogId}
//                 aria-modal
//                 aria-labelledby={headerId}
//                 onClose={() => setIsDialogOpen(false)}
//                 // Close dialog when clicking backdrop
//                 onClick={e => {
//                     if (e.target === e.currentTarget) toggleDialog();
//                 }}
//                 style={{
//                     padding: '2rem',
//                     borderRadius: '12px',
//                     boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
//                     fontSize: '1.1rem',
//                     display: 'flex',
//                     flexDirection: 'column',
//                     alignItems: 'center',
//                 }}
//             >
//                 <DayPicker
//                     month={month}
//                     onMonthChange={setMonth}
//                     autoFocus
//                     mode="range"
//                     selected={selectedRange}
//                     onSelect={handleDayPickerSelect}
//                     numberOfMonths={1}
//                     formatters={{
//                         formatWeekdayName: day => format(day, 'ccc'),
//                     }}
//                     classNames={{
//                         caption: 'custom-caption',
//                         day: 'custom-day-spacing',
//                         day_button: 'custom-day-spacing',
//                         head_cell: 'custom-day-spacing',
//                         selected: 'custom-selected-day',
//                         nav: 'custom-nav',
//                         nav_button_next: 'custom-nav-button',
//                         nav_button_previous: 'custom-nav-button',
//                     }}
//                 />
//                 <style>{`
//           .custom-caption {
//             display: flex;
//             justify-content: space-between;
//             align-items: center;
//             padding: 0 0.5rem;
//           }
//           .custom-day-spacing {
//             min-width: 36px;
//             min-height: 36px;
//             align-items: center;
//             justify-content: center;
//             font-size: 1.1rem;
//           }
//           .custom-selected-day {
//             background: #83b6ff;
//             color: white;
//             border-radius: 6px;
//             font-weight: bold;
//             box-shadow: 0 0 0 2px #83b6ff33;
//           }
//           .custom-nav {
//             position: absolute;
//             min-height: 36px;
//             right: 1.9rem;
//             top: 1.7rem;
//             display: flex;
//             align-items: center;
//             color:rgb(36, 99, 195);
//           }
//           .custom-nav-button {
//             background: none;
//             border: none;
//             color:rgb(97, 109, 127);
//             font-size: 0.9rem;
//             cursor: pointer;
//             transition: background 0.2s;
//           }
//             .custom-nav-button svg {
//               fill:rgb(121, 135, 156) !important;
//           }
//         `}</style>
//                 <div
//                     style={{
//                         display: 'flex',
//                         justifyContent: 'flex-end',
//                         gap: '1rem',
//                         marginTop: '1.5rem',
//                     }}
//                 >
//                     <button
//                         type="button"
//                         onClick={handleClear}
//                         style={{
//                             background: '#eee',
//                             border: 'none',
//                             padding: '0.5rem 1.2rem',
//                             borderRadius: '4px',
//                             fontSize: '1rem',
//                         }}
//                     >
//                         Clear
//                     </button>
//                     <button
//                         type="button"
//                         onClick={handleDone}
//                         style={{
//                             background: '#83b6ff',
//                             color: 'white',
//                             border: 'none',
//                             padding: '0.5rem 1.2rem',
//                             borderRadius: '4px',
//                             fontSize: '1rem',
//                         }}
//                     >
//                         Done
//                     </button>
//                 </div>
//             </dialog>
//         </div>
//     );
// }

'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { format } from 'date-fns';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css'; // make sure this is imported once globally

export function MyCalendar() {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const dialogId = useId();
    const [month, setMonth] = useState(new Date());
    const [selectedRange, setSelectedRange] = useState<DateRange>();
    const [inputValue, setInputValue] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const toggleDialog = () => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (isDialogOpen) {
            dialog.close();
            setIsDialogOpen(false);
        } else {
            dialog.showModal();
            setIsDialogOpen(true);
        }
    };

    // lock scroll when dialog open
    useEffect(() => {
        document.body.style.overflow = isDialogOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isDialogOpen]);

    const handleDayPickerSelect = (range: DateRange | undefined) => {
        setSelectedRange(range);
        if (range?.from && range?.to)
            setInputValue(
                `${format(range.from, 'MM/dd/yyyy')} - ${format(range.to, 'MM/dd/yyyy')}`
            );
        else if (range?.from) setInputValue(format(range.from, 'MM/dd/yyyy'));
        else setInputValue('');
    };

    const handleClear = () => {
        setSelectedRange(undefined);
        setInputValue('');
    };

    const handleDone = () => toggleDialog();

    return (
        <div className="flex flex-col items-center mt-8">
            <label htmlFor="date-input" className="text-lg mb-2 font-semibold">
                Date Range:
            </label>

            <input
                id="date-input"
                type="text"
                value={inputValue}
                placeholder="MM/dd/yyyy - MM/dd/yyyy"
                onChange={e => setInputValue(e.target.value)}
                className="text-lg px-4 py-2 mb-2 w-56 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <button
                onClick={toggleDialog}
                className="text-lg px-4 py-2 mb-4 bg-blue-100 hover:bg-blue-200 rounded-md"
                aria-controls={dialogId}
                aria-haspopup="dialog"
                aria-expanded={isDialogOpen}
            >
                📆
            </button>

            <p className="text-base mb-4 text-gray-700">
                {selectedRange?.from && selectedRange?.to
                    ? `${selectedRange.from.toDateString()} - ${selectedRange.to.toDateString()}`
                    : 'Please pick a date range'}
            </p>

            <dialog
                ref={dialogRef}
                id={dialogId}
                onClick={e => {
                    if (e.target === e.currentTarget) toggleDialog();
                }}
                className="p-6 rounded-xl shadow-2xl border-0 bg-white backdrop:bg-black/30 w-fit fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
                <DayPicker
                    month={month}
                    onMonthChange={setMonth}
                    mode="range"
                    selected={selectedRange}
                    onSelect={handleDayPickerSelect}
                    className="text-gray-800"
                />

                <div className="flex justify-end gap-4 mt-6">
                    <button
                        onClick={handleClear}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2 rounded-md"
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleDone}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md"
                    >
                        Done
                    </button>
                </div>
            </dialog>
        </div>
    );
}
