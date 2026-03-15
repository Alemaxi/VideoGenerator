import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api';
import { GenerationJob, GenerationService } from '../../services/generation';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-generate',
  templateUrl: './generate.page.html',
  styleUrls: ['./generate.page.scss'],
  standalone: false,
})
export class GeneratePage implements OnDestroy {
  private api = inject(ApiService);
  private generationService = inject(GenerationService);
  private toastCtrl = inject(ToastController);

  // Mode
  mode = signal<'text-to-video' | 'image-to-video' | 'first-last-frame'>('text-to-video');

  // Prompt
  prompt = signal('');
  negativePrompt = signal('');

  // Settings
  model = signal('veo-3.0-generate-preview');
  durationSeconds = signal(8);
  aspectRatio = signal('16:9');
  enhancePrompt = signal(true);
  generateAudio = signal(true);

  // Image-to-video
  imageBase64 = signal<string | null>(null);
  imageMimeType = signal('image/jpeg');

  // First+Last frame
  firstFrameBase64 = signal<string | null>(null);
  firstFrameMimeType = signal('image/jpeg');
  lastFrameBase64 = signal<string | null>(null);
  lastFrameMimeType = signal('image/jpeg');

  // State
  isGenerating = signal(false);
  currentJob = signal<GenerationJob | null>(null);

  statusLabel = computed(() => {
    switch (this.currentJob()?.status) {
      case 'processing': return 'Gerando vídeo... (pode levar alguns minutos)';
      case 'completed': return 'Vídeo gerado com sucesso!';
      case 'failed': return 'Falha na geração';
      default: return '';
    }
  });

  private readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const [meta, base64] = dataUrl.split(',');
        const mimeType = meta.split(':')[1].split(';')[0];
        resolve({ base64, mimeType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async onImageSelected(event: Event, slot: 'image' | 'firstFrame' | 'lastFrame') {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const { base64, mimeType } = await this.readFileAsBase64(file);
    if (slot === 'image') { this.imageBase64.set(base64); this.imageMimeType.set(mimeType); }
    else if (slot === 'firstFrame') { this.firstFrameBase64.set(base64); this.firstFrameMimeType.set(mimeType); }
    else { this.lastFrameBase64.set(base64); this.lastFrameMimeType.set(mimeType); }
  }

  async generate() {
    if (!this.prompt().trim()) return;

    if (this.mode() === 'image-to-video' && !this.imageBase64()) {
      const toast = await this.toastCtrl.create({ message: 'Selecione uma imagem de entrada', duration: 3000, color: 'warning' });
      await toast.present();
      return;
    }

    if (this.mode() === 'first-last-frame' && (!this.firstFrameBase64() || !this.lastFrameBase64())) {
      const toast = await this.toastCtrl.create({ message: 'Selecione o primeiro e o último frame', duration: 3000, color: 'warning' });
      await toast.present();
      return;
    }

    this.isGenerating.set(true);
    this.currentJob.set(null);

    try {
      const result = await firstValueFrom(this.api.generateVideo({
        prompt: this.prompt(),
        negativePrompt: this.negativePrompt() || undefined,
        model: this.model(),
        durationSeconds: this.durationSeconds(),
        aspectRatio: this.aspectRatio(),
        enhancePrompt: this.mode() === 'text-to-video' ? this.enhancePrompt() : undefined,
        generateAudio: this.generateAudio(),
        mode: this.mode(),
        imageBase64: this.imageBase64() ?? undefined,
        imageMimeType: this.imageMimeType(),
        firstFrameBase64: this.firstFrameBase64() ?? undefined,
        firstFrameMimeType: this.firstFrameMimeType(),
        lastFrameBase64: this.lastFrameBase64() ?? undefined,
        lastFrameMimeType: this.lastFrameMimeType(),
      }));

      this.currentJob.set({ id: result.id, status: result.status, prompt: this.prompt() });

      this.generationService.pollStatus(result.id, (job) => {
        this.currentJob.set(job);
        if (job.status !== 'processing') {
          this.isGenerating.set(false);
        }
      });

    } catch (err: any) {
      this.isGenerating.set(false);
      const msg = err?.error?.error ?? 'Erro ao iniciar geração';
      const toast = await this.toastCtrl.create({ message: msg, duration: 4000, color: 'danger' });
      await toast.present();
    }
  }

  setMode(value: string | undefined) {
    if (value === 'image-to-video' || value === 'first-last-frame') {
      this.mode.set(value);
    } else {
      this.mode.set('text-to-video');
    }
  }

  ngOnDestroy() {
    this.generationService.stopAllPolling();
  }
}
