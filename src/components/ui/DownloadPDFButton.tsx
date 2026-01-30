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
        margin: 0;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          padding: 0.5in;
        }
        .no-print {
          display: none !important;
        }
        /* Scale down wide charts to fit print page */
        .overflow-x-auto {
          overflow: visible !important;
        }
        .overflow-x-auto .recharts-responsive-container {
          transform: scale(0.75);
          transform-origin: top left;
          height: 225px !important;
        }
      }
    `,
        onBeforePrint: () => {
            if (targetRef.current) {
                const timestamp = document.createElement('div');
                timestamp.className = 'print-timestamp';
                timestamp.style.cssText =
                    'text-align: right; font-size: 12px; color: #666; margin-bottom: 16px;';
                timestamp.textContent = `Downloaded at: ${new Date().toLocaleString()}`;
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
