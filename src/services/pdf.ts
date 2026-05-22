import * as pdfjs from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { awareness } from './awareness';
import { RetryManager } from './retry';

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export type PDFMetadata = {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  keywords?: string[];
  pageCount: number;
  creationDate?: Date;
  modificationDate?: Date;
};

class PDFService {
  private retry = new RetryManager('pdf-service');

  async getMetadata(data: ArrayBuffer): Promise<PDFMetadata> {
    return this.retry.run(async () => {
      const pdfDoc = await PDFDocument.load(data, { updateMetadata: false });
      
      const keywordsStr = pdfDoc.getKeywords();
      let keywordsArr: string[] | undefined = undefined;
      
      if (keywordsStr) {
        keywordsArr = keywordsStr.split(/[,; ]+/).filter(k => k.trim().length > 0);
      }

      return {
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject(),
        creator: pdfDoc.getCreator(),
        keywords: keywordsArr,
        creationDate: pdfDoc.getCreationDate(),
        modificationDate: pdfDoc.getModificationDate(),
        pageCount: pdfDoc.getPageCount()
      };
    });
  }

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
      
      page.cleanup();

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

  async replaceText(
    data: ArrayBuffer, 
    pageNum: number, 
    text: string, 
    box: { x: number, y: number, w: number, h: number }, 
    fontSize = 12,
    color = { r: 0, g: 0, b: 0 },
    fontFamily = 'sans-serif',
    formatting = { bold: false, italic: false, underline: false, bgColor: { r: 255, g: 255, b: 255, a: 1 } }
  ): Promise<Uint8Array> {
    return this.retry.run(async () => {
      const pdfDoc = await PDFDocument.load(data);
      
      let fontType = StandardFonts.Helvetica;
      const lowerFont = fontFamily.toLowerCase();
      
      const isSerif = lowerFont.includes('times') || (lowerFont.includes('serif') && !lowerFont.includes('sans'));
      const isMono = lowerFont.includes('courier') || lowerFont.includes('mono');
      
      if (isSerif) {
        if (formatting.bold && formatting.italic) fontType = StandardFonts.TimesRomanBoldItalic;
        else if (formatting.bold) fontType = StandardFonts.TimesRomanBold;
        else if (formatting.italic) fontType = StandardFonts.TimesRomanItalic;
        else fontType = StandardFonts.TimesRoman;
      } else if (isMono) {
        if (formatting.bold && formatting.italic) fontType = StandardFonts.CourierBoldOblique;
        else if (formatting.bold) fontType = StandardFonts.CourierBold;
        else if (formatting.italic) fontType = StandardFonts.CourierOblique;
        else fontType = StandardFonts.Courier;
      } else {
        if (formatting.bold && formatting.italic) fontType = StandardFonts.HelveticaBoldOblique;
        else if (formatting.bold) fontType = StandardFonts.HelveticaBold;
        else if (formatting.italic) fontType = StandardFonts.HelveticaOblique;
        else fontType = StandardFonts.Helvetica;
      }

      const font = await pdfDoc.embedFont(fontType);
      
      const page = pdfDoc.getPages()[pageNum - 1];
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      
      // Draw background rectangle to erase old text and fill new
      page.drawRectangle({
        x: box.x,
        y: box.y,
        width: Math.max(box.w, textWidth + 4),
        height: box.h,
        color: rgb(formatting.bgColor.r / 255, formatting.bgColor.g / 255, formatting.bgColor.b / 255),
        opacity: formatting.bgColor.a
      });

      // Draw new text
      page.drawText(text, {
        x: box.x,
        y: box.y + 2, // slight offset for font baseline
        size: fontSize,
        font,
        color: rgb(color.r / 255, color.g / 255, color.b / 255)
      });
      
      if (formatting.underline) {
        page.drawLine({
          start: { x: box.x, y: box.y + Math.max(1, fontSize * 0.1) }, 
          end: { x: box.x + textWidth, y: box.y + Math.max(1, fontSize * 0.1) },
          thickness: Math.max(1, fontSize * 0.05),
          color: rgb(color.r / 255, color.g / 255, color.b / 255)
        });
      }

      const bytes = await pdfDoc.save();
      awareness.recordSuccess('pdf-replace-text');
      return bytes;
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
      
      if (paths.length >= 2) {
        let svgPath = `M ${paths[0].x} ${paths[0].y} `;
        for (let i = 1; i < paths.length; i++) {
          svgPath += `L ${paths[i].x} ${paths[i].y} `;
        }
        
        page.drawSvgPath(svgPath, {
          borderColor: rgb(1, 0, 0),
          borderWidth: 2,
          borderOpacity: 0.5
        });
      }

      const bytes = await pdfDoc.save();
      awareness.recordSuccess('pdf-draw');
      return bytes;
    });
  }
}

export const pdfService = new PDFService();
