import type { jsPDF as JsPdf } from "jspdf";
import type { UserOptions } from "jspdf-autotable";

type JsPdfConstructor = new (
  options?: ConstructorParameters<typeof JsPdf>[0],
) => JsPdf;
type AutoTableFn = (doc: JsPdf, options: UserOptions) => void;

declare global {
  interface Window {
    jspdf?: {
      jsPDF?: JsPdfConstructor;
    };
    autoTable?: AutoTableFn;
  }
}

const JSPDF_RUNTIME_URL = '/vendor/jspdf.umd.min.js';
const JSPDF_AUTOTABLE_RUNTIME_URL = '/vendor/jspdf.plugin.autotable.min.js';

let pdfRuntimePromise: Promise<{ jsPDF: JsPdfConstructor; autoTable: AutoTableFn }> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[data-pdf-src="${src}"]`);

    if (existingScript?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.pdfSrc = src;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export async function loadPdfRuntime(): Promise<{ jsPDF: JsPdfConstructor; autoTable: AutoTableFn }> {
  if (!pdfRuntimePromise) {
    pdfRuntimePromise = (async () => {
      await loadScript(JSPDF_RUNTIME_URL);
      await loadScript(JSPDF_AUTOTABLE_RUNTIME_URL);

      const jsPDF = window.jspdf?.jsPDF;
      const autoTable = window.autoTable;

      if (!jsPDF || !autoTable) {
        throw new Error('PDF export libraries failed to load.');
      }

      return { jsPDF, autoTable };
    })();
  }

  return pdfRuntimePromise;
}
