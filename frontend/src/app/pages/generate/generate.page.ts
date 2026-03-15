import { Component, OnDestroy } from '@angular/core';
import { ApiService } from '../../services/api';
import { GenerationJob, GenerationService } from '../../services/generation';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-generate',
  templateUrl: './generate.page.html',
  styleUrls: ['./generate.page.scss'],
})
export class GeneratePage implements OnDestroy {
  prompt = '';
  negativePrompt = '';
  model = 'veo-3.0-generate-preview';
  durationSeconds = 8;
  aspectRatio = '16:9';
  enhancePrompt = true;
  generateAudio = true;

  isGenerating = false;
  currentJob: GenerationJob | null = null;

  get statusLabel(): string {
    switch (this.currentJob?.status) {
      case 'processing': return 'Gerando vídeo... (pode levar alguns minutos)';
      case 'completed': return 'Vídeo gerado com sucesso!';
      case 'failed': return 'Falha na geração';
      default: return '';
    }
  }

  constructor(
    private api: ApiService,
    private generationService: GenerationService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async generate() {
    if (!this.prompt.trim()) return;

    this.isGenerating = true;
    this.currentJob = null;

    try {
      const result = await this.api.generateVideo({
        prompt: this.prompt,
        negativePrompt: this.negativePrompt || undefined,
        model: this.model,
        durationSeconds: this.durationSeconds,
        aspectRatio: this.aspectRatio,
        enhancePrompt: this.enhancePrompt,
        generateAudio: this.generateAudio,
      }).toPromise();

      this.currentJob = {
        id: result.id,
        status: result.status,
        prompt: this.prompt,
      };

      this.generationService.pollStatus(result.id, (job) => {
        this.currentJob = job;
        if (job.status !== 'processing') {
          this.isGenerating = false;
        }
      });

    } catch (err: any) {
      this.isGenerating = false;
      const msg = err?.error?.error ?? 'Erro ao iniciar geração';
      const toast = await this.toastCtrl.create({ message: msg, duration: 4000, color: 'danger' });
      await toast.present();
    }
  }

  ngOnDestroy() {
    this.generationService.stopAllPolling();
  }
}
