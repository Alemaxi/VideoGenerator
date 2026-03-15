import { Injectable, inject } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { firstValueFrom } from 'rxjs';
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
  private api = inject(ApiService);
  private pollingMap = new Map<number, Subscription>();

  pollStatus(generationId: number, onUpdate: (job: GenerationJob) => void): void {
    if (this.pollingMap.has(generationId)) return;

    const sub = interval(5000).subscribe(async () => {
      try {
        const result = await firstValueFrom(this.api.checkGenerationStatus(generationId));
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
