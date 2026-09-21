import { createElement } from "react";
import { createRoot } from "react-dom/client";
import RentalAgreement, {
    type AgreementData,
} from "@/components/RentalAgreement";

export type { AgreementData };

export const printAgreement = (data: AgreementData): void => {
    const printWindow = window.open("", "_blank", "width=1000,height=800");

    if (!printWindow) {
        window.alert("Please allow pop-ups to open the agreement.");
        return;
    }

    const doc = printWindow.document;
    doc.title = `HavenSpace Agreement - Lease ${data.leaseId}`;
    doc.documentElement.lang = "en";

    const viewport = doc.createElement("meta");
    viewport.name = "viewport";
    viewport.content = "width=device-width, initial-scale=1";
    doc.head.appendChild(viewport);

    const container = doc.createElement("div");
    container.textContent = "Loading agreement preview...";
    doc.body.appendChild(container);

    const stylesheetLoads: Promise<void>[] = [];

    document
        .querySelectorAll<HTMLStyleElement | HTMLLinkElement>(
            'style, link[rel="stylesheet"]',
        )
        .forEach((source) => {
            if (source instanceof HTMLStyleElement) {
                doc.head.appendChild(source.cloneNode(true));
                return;
            }

            const link = source.cloneNode(true) as HTMLLinkElement;
            link.href = source.href;

            const loaded = new Promise<void>((resolve, reject) => {
                link.onload = () => resolve();
                link.onerror = () => reject(new Error("Stylesheet failed to load"));
            });

            stylesheetLoads.push(loaded);
            doc.head.appendChild(link);
        });

    const handlePrint = () => {
        if (printWindow.closed) return;

        printWindow.focus();
        printWindow.print();
    };

    void Promise.all(stylesheetLoads)
        .then(() => {
            if (printWindow.closed) return;

            const root = createRoot(container);

            printWindow.addEventListener(
                "pagehide",
                () => root.unmount(),
                { once: true },
            );

            root.render(
                createElement(RentalAgreement, {
                    data,
                    onPrint: handlePrint,
                }),
            );

            printWindow.focus();
        })
        .catch(() => {
            if (!printWindow.closed) {
                container.textContent =
                    "Agreement styles could not load. Close this window and try again.";
            }
        });
};