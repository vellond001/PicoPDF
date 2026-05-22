import { createWorker, Worker } from 'tesseract.js';
import { awareness } from './awareness';
import { RetryManager } from './retry';

class OCRService {
  private worker: Worker | null = null;
  private retry = new RetryManager('ocr-service');

  async recognize(image: any): Promise<string> {
    return this.retry.run(async () => {
      if (!this.worker) {
        this.worker = await createWorker('eng');
      }
      
      const { data: { text } } = await this.worker.recognize(image);
      awareness.recordSuccess('ocr-recognize');
      return text;
    });
  }

  async getWords(image: any) {
    return this.retry.run(async () => {
      if (!this.worker) {
        this.worker = await createWorker('eng', 1, {
          logger: m => console.log(m)
        });
      }
      
      const { data } = await this.worker.recognize(image);
      return (data as any).words;
    });
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const ocrService = new OCRService();
