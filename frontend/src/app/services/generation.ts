import { Injectable } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { ApiService } from './api';

export interface GenerationJob {
  id: number;
  status: string;
  prompt: string;
  outputPath?: string;
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class GenerationService {
  private pollingMap = new Map<number, Subscription>();

  constructor(private api: ApiService) {}

  pollStatus(generationId: number, onUpdate: (job: GenerationJob) => void): void {
    if (this.pollingMap.has(generationId)) return;

    const sub = interval(5000).subscribe(async () => {
      try {
        const result = await this.api.checkGenerationStatus(generationId).toPromise();
        onUpdate(result);

        if (result.status === 'completed' || result.status === 'failed') {
          this.stopPolling(generationId);
        }
      } catch (err) {
        console.error('Error polling generation status:', err);
      }
    });

    this.pollingMap.set(generationId, sub);
  }

  stopPolling(generationId: number): void {
    const sub = this.pollingMap.get(generationId);
    if (sub) {
      sub.unsubscribe();
      this.pollingMap.delete(generationId);
    }
  }

  stopAllPolling(): void {
    this.pollingMap.forEach(sub => sub.unsubscribe());
    this.pollingMap.clear();
  }
}
