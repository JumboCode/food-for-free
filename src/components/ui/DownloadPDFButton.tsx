import React, { useState } from 'react';
import { Download } from 'lucide-react';

type DownloadPDFButtonProps = {
    targetRef: React.RefObject<HTMLElement | null>;
    fileName?: string;
};

const DownloadPDFButton: React.FC<DownloadPDFButtonProps> = ({
    targetRef,
    fileName = 'overview',
}) => {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        if (!targetRef.current || isDownloading) return;
        setIsDownloading(true);

        try {
            const { default: html2pdf } = await import('html2pdf.js');
            const container = targetRef.current.cloneNode(true) as HTMLElement;
            const timestamp = document.createElement('div');
            timestamp.style.cssText =
                'text-align:right;font-size:10px;color:#666;margin-bottom:8px;';
            timestamp.textContent = `Generated: ${new Date().toLocaleString()}`;
            container.prepend(timestamp);

            await html2pdf()
                .set({
                    margin: [0.3, 0.3, 0.3, 0.3],
                    filename: `${fileName}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        onclone: (clonedDoc: Document) => {
                            clonedDoc.head
                                .querySelectorAll('style,link[rel="stylesheet"]')
                                .forEach(node => node.remove());
                        },
                    },
                    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
                })
                .from(container)
                .save();
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="no-print relative z-10 flex items-center gap-2 text-blue-600 underline font-semibold px-3 py-2 rounded hover:bg-blue-50 transition cursor-pointer"
            title="Download PDF"
        >
            <Download className="w-4 h-4" />
            {isDownloading ? 'Downloading...' : 'Download PDF'}
        </button>
    );
};

export { DownloadPDFButton };
export default DownloadPDFButton;
