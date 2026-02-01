import React from 'react';
import { Download } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

type DownloadPDFButtonProps = {
    targetRef: React.RefObject<HTMLElement | null>;
    fileName?: string;
};

const DownloadPDFButton: React.FC<DownloadPDFButtonProps> = ({
    targetRef,
    fileName = 'overview',
}) => {
    const handlePrint = useReactToPrint({
        contentRef: targetRef,
        documentTitle: fileName,
        pageStyle: `
      @page {
        size: letter;
        margin: 0.3in;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        body {
          padding: 0;
          margin: 0;
        }
        
        .no-print {
          display: none !important;
        }
        
        /* Scale entire content to fit */
        body > div {
          transform: scale(0.85);
          transform-origin: top left;
          width: 117.65%;
        }
        
        /* Compact spacing for print */
        h1 {
          font-size: 18px !important;
          margin-bottom: 4px !important;
          padding-bottom: 0 !important;
        }
        
        p {
          font-size: 11px !important;
          margin-bottom: 8px !important;
          padding-bottom: 0 !important;
        }
        
        /* Chart containers - reduce spacing */
        .overflow-x-auto {
          overflow: visible !important;
          margin-bottom: 8px !important;
        }
        
        /* Make monthly chart smaller */
        .overflow-x-auto .recharts-responsive-container {
          height: 180px !important;
        }
        
        /* Flex layout for donut + stats - reduce gap */
        .flex.flex-col.lg\\:flex-row {
          gap: 8px !important;
          margin-top: 0 !important;
          margin-bottom: 8px !important;
        }
        
        /* Donut chart container */
        .w-full.lg\\:flex-1 {
          margin-bottom: 0 !important;
        }
        
        /* Make donut chart more compact */
        .w-full.lg\\:flex-1 .recharts-responsive-container {
          height: 200px !important;
        }
        
        /* Force donut chart SVG to render */
        .recharts-surface,
        .recharts-wrapper svg {
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Stats cards - reduce spacing */
        .flex.flex-col.gap-6.w-full.lg\\:w-120 {
          gap: 8px !important;
        }
        
        /* Individual stat cards - make more compact */
        .flex.flex-col.gap-6.w-full.lg\\:w-120 > * {
          padding: 12px !important;
          min-height: auto !important;
        }
        
        /* Delivery Summary section */
        h2 {
          font-size: 16px !important;
          margin-bottom: 4px !important;
        }
        
        /* Delivery Summary list - make more compact */
        .flex.flex-col > * {
          font-size: 11px !important;
          padding: 8px 12px !important;
        }
      }
    `,
        onBeforePrint: () => {
            if (targetRef.current) {
                const timestamp = document.createElement('div');
                timestamp.className = 'print-timestamp';
                timestamp.style.cssText =
                    'text-align: right; font-size: 9px; color: #666; margin-bottom: 6px;';
                timestamp.textContent = `Generated: ${new Date().toLocaleString()}`;
                targetRef.current.insertBefore(timestamp, targetRef.current.firstChild);
            }
            return Promise.resolve();
        },
        onAfterPrint: () => {
            if (targetRef.current) {
                const timestamp = targetRef.current.querySelector('.print-timestamp');
                if (timestamp) {
                    timestamp.remove();
                }
            }
        },
    });

    return (
        <button
            type="button"
            onClick={() => handlePrint()}
            className="no-print relative z-10 flex items-center gap-2 text-blue-600 underline font-semibold px-3 py-2 rounded hover:bg-blue-50 transition cursor-pointer"
            title="Download PDF"
        >
            <Download className="w-4 h-4" />
            Download PDF
        </button>
    );
};

export { DownloadPDFButton };
export default DownloadPDFButton;
