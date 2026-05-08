import * as pdfjs from 'pdfjs-dist';
import pdfWorkerURL from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { awareness } from './awareness';
import { RetryManager } from './retry';

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerURL;

export type PDFMetadata = {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  keywords?: string[];
  pageCount: number;
};

class PDFService {
  private retry = new RetryManager('pdf-service');

  async loadPDF(data: ArrayBuffer): Promise<pdfjs.PDFDocumentProxy> {
    return this.retry.run(async () => {
      const loadingTask = pdfjs.getDocument({ data: data.slice(0) });
      const pdf = await loadingTask.promise;
      awareness.recordSuccess('pdf-load');
      return pdf;
    });
  }

  async renderPage(pdf: pdfjs.PDFDocumentProxy, pageNum: number, scale = 1.5): Promise<HTMLCanvasElement> {
    return this.retry.run(async () => {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.scale(dpr, dpr);

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas as any // Add canvas to satisfy TS types in some versions
      } as any).promise;

      awareness.recordSuccess('pdf-render');
      return canvas;
    });
  }

  async addWatermark(data: ArrayBuffer, text: string): Promise<Uint8Array> {
    return this.retry.run(async () => {
      const pdfDoc = await PDFDocument.load(data);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(text, {
          x: width / 2 - 100,
          y: height / 2,
          size: 50,
          font,
          color: rgb(0.7, 0.7, 0.7),
          opacity: 0.3,
          rotate: { type: 'degrees', angle: 45 } as any
        });
      }

      const bytes = await pdfDoc.save();
      awareness.recordSuccess('pdf-edit');
      return bytes;
    });
  }

  async splitPDF(data: ArrayBuffer): Promise<Uint8Array[]> {
    return this.retry.run(async () => {
      const pdfDoc = await PDFDocument.load(data);
      const pageCount = pdfDoc.getPageCount();
      const results: Uint8Array[] = [];

      for (let i = 0; i < pageCount; i++) {
        const newDoc = await PDFDocument.create();
        const [page] = await newDoc.copyPages(pdfDoc, [i]);
        newDoc.addPage(page);
        results.push(await newDoc.save());
      }

      awareness.recordSuccess('pdf-split');
      return results;
    });
  }

  async insertText(data: ArrayBuffer, pageNum: number, text: string, x: number, y: number, fontSize = 12): Promise<Uint8Array> {
    return this.retry.run(async () => {
      const pdfDoc = await PDFDocument.load(data);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const page = pdfDoc.getPages()[pageNum - 1];
      
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0)
      });

      const bytes = await pdfDoc.save();
      awareness.recordSuccess('pdf-insert-text');
      return bytes;
    });
  }

  async insertImage(data: ArrayBuffer, pageNum: number, imgData: ArrayBuffer, x: number, y: number, width: number, height: number): Promise<Uint8Array> {
    return this.retry.run(async () => {
      const pdfDoc = await PDFDocument.load(data);
      const image = await pdfDoc.embedPng(imgData); // Or embedJpg
      const page = pdfDoc.getPages()[pageNum - 1];
      
      page.drawImage(image, {
        x,
        y,
        width,
        height
      });

      const bytes = await pdfDoc.save();
      awareness.recordSuccess('pdf-insert-image');
      return bytes;
    });
  }

  async addPageNumbers(data: ArrayBuffer): Promise<Uint8Array> {
    return this.retry.run(async () => {
      const pdfDoc = await PDFDocument.load(data);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width } = page.getSize();
        page.drawText(`Page ${i + 1} / ${pages.length}`, {
          x: width / 2 - 20,
          y: 20,
          size: 10,
          font,
          color: rgb(0, 0, 0)
        });
      }

      const bytes = await pdfDoc.save();
      awareness.recordSuccess('pdf-page-numbers');
      return bytes;
    });
  }

  async compressPDF(data: ArrayBuffer): Promise<Uint8Array> {
    return this.retry.run(async () => {
      const pdfDoc = await PDFDocument.load(data);
      // "Compressing" by re-saving without object streams. Best effort.
      const bytes = await pdfDoc.save({ useObjectStreams: false });
      awareness.recordSuccess('pdf-compress');
      return bytes;
    });
  }

  async extractToText(data: ArrayBuffer): Promise<string> {
    return this.retry.run(async () => {
      const loadingTask = pdfjs.getDocument({ data: data.slice(0) });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(' ') + '\n\n';
      }

      awareness.recordSuccess('pdf-extract-text');
      return fullText;
    });
  }

  async applyDrawing(data: ArrayBuffer, pageNum: number, paths: { x: number, y: number }[]): Promise<Uint8Array> {
    return this.retry.run(async () => {
      const pdfDoc = await PDFDocument.load(data);
      const page = pdfDoc.getPages()[pageNum - 1];
      
      for (let i = 0; i < paths.length - 1; i++) {
        page.drawLine({
          start: { x: paths[i].x, y: paths[i].y },
          end: { x: paths[i+1].x, y: paths[i+1].y },
          thickness: 2,
          color: rgb(1, 0, 0),
          opacity: 0.5
        });
      }

      const bytes = await pdfDoc.save();
      awareness.recordSuccess('pdf-draw');
      return bytes;
    });
  }
}

export const pdfService = new PDFService();
