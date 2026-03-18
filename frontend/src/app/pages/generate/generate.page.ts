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

  readonly PROVIDERS = [
    {
      id: 'google-ai-studio' as const,
      label: 'Google AI Studio',
      defaultModel: 'veo-3.1-generate-preview',
      defaultDuration: 8,
      defaultAspectRatio: '16:9',
      models: [
        { value: 'veo-3.1-generate-preview',      label: 'VEO 3.1 (Preview)',      supportedModes: ['text-to-video', 'image-to-video', 'first-last-frame'] },
        { value: 'veo-3.1-fast-generate-preview', label: 'VEO 3.1 Fast (Preview)', supportedModes: ['text-to-video', 'image-to-video'] },
        { value: 'veo-3.0-generate',              label: 'VEO 3.0 (GA)',            supportedModes: ['text-to-video', 'image-to-video'] },
      ],
      durationOptions: [
        { value: 5, label: '5 segundos' },
        { value: 8, label: '8 segundos' },
      ],
      aspectRatios: [
        { value: '16:9', label: '16:9 (Landscape)' },
        { value: '9:16', label: '9:16 (Portrait)' },
        { value: '1:1',  label: '1:1 (Square)' },
      ],
    },
    {
      id: 'vertex-ai' as const,
      label: 'Vertex AI',
      defaultModel: 'veo-3.1-generate-preview',
      defaultDuration: 8,
      defaultAspectRatio: '16:9',
      models: [
        { value: 'veo-3.1-generate-preview',      label: 'VEO 3.1 (Preview)',      supportedModes: ['text-to-video', 'image-to-video', 'first-last-frame'] },
        { value: 'veo-3.1-fast-generate-preview', label: 'VEO 3.1 Fast (Preview)', supportedModes: ['text-to-video', 'image-to-video'] },
        { value: 'veo-3.0-generate',              label: 'VEO 3.0 (GA)',            supportedModes: ['text-to-video', 'image-to-video'] },
      ],
      durationOptions: [
        { value: 5, label: '5 segundos' },
        { value: 8, label: '8 segundos' },
      ],
      aspectRatios: [
        { value: '16:9', label: '16:9 (Landscape)' },
        { value: '9:16', label: '9:16 (Portrait)' },
        { value: '1:1',  label: '1:1 (Square)' },
      ],
    },
    {
      id: 'openai' as const,
      label: 'OpenAI (Sora)',
      defaultModel: 'sora-2',
      defaultDuration: 8,
      defaultAspectRatio: '1280x720',
      models: [
        {
          value: 'sora-2',
          label: 'Sora 2',
          supportedModes: ['text-to-video', 'image-to-video'],
          aspectRatios: [
            { value: '1280x720', label: 'Landscape 1280×720' },
            { value: '720x1280', label: 'Portrait  720×1280' },
          ],
        },
        {
          value: 'sora-2-pro',
          label: 'Sora 2 Pro',
          supportedModes: ['text-to-video', 'image-to-video'],
          aspectRatios: [
            { value: '1280x720',  label: 'Landscape 1280×720  ($0.30/s)' },
            { value: '720x1280',  label: 'Portrait  720×1280  ($0.30/s)' },
            { value: '1792x1024', label: 'Landscape 1792×1024 ($0.50/s)' },
            { value: '1024x1792', label: 'Portrait  1024×1792 ($0.50/s)' },
            { value: '1920x1080', label: 'Landscape 1920×1080 ($0.70/s)' },
            { value: '1080x1920', label: 'Portrait  1080×1920 ($0.70/s)' },
          ],
        },
      ],
      durationOptions: [
        { value: 4,  label: '4 segundos' },
        { value: 8,  label: '8 segundos' },
        { value: 12, label: '12 segundos' },
      ],
      aspectRatios: [],
    },
  ];

  // Mode e Provider
  mode = signal<'text-to-video' | 'image-to-video' | 'first-last-frame'>('text-to-video');
  provider = signal<'google-ai-studio' | 'vertex-ai' | 'openai'>('google-ai-studio');
  currentProviderConfig = computed(() => this.PROVIDERS.find(p => p.id === this.provider())!);
  currentModelConfig = computed(() => this.currentProviderConfig().models.find((m: any) => m.value === this.model()));
  currentAspectRatios = computed(() => {
    const modelRatios = (this.currentModelConfig() as any)?.aspectRatios;
    return (modelRatios?.length ? modelRatios : this.currentProviderConfig().aspectRatios) as { value: string; label: string }[];
  });

  isModeSupported = (mode: string) => computed(() => {
    const supported = (this.currentModelConfig() as any)?.supportedModes as string[] | undefined;
    return !supported || supported.includes(mode);
  });

  // Prompt
  prompt = signal('');
  negativePrompt = signal('');

  // Settings
  model = signal('veo-3.1-generate-preview');
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
        provider: this.provider(),
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

  setProvider(value: string | undefined) {
    const config = this.PROVIDERS.find(p => p.id === value) ?? this.PROVIDERS[0];
    this.provider.set(config.id);
    this.model.set(config.defaultModel);
    this.durationSeconds.set(config.defaultDuration);
    this.aspectRatio.set(config.defaultAspectRatio);
  }

  setModel(value: string) {
    this.model.set(value);
    const modelConfig = this.currentProviderConfig().models.find((m: any) => m.value === value) as any;
    const firstRatio = modelConfig?.aspectRatios?.[0]?.value ?? this.currentProviderConfig().defaultAspectRatio;
    this.aspectRatio.set(firstRatio);
    const supported = modelConfig?.supportedModes as string[] | undefined;
    if (supported && !supported.includes(this.mode())) {
      this.mode.set('text-to-video');
    }
  }

  async download() {
    const job = this.currentJob();
    if (!job?.id) return;
    const response = await firstValueFrom(this.api.downloadGeneration(job.id));
    const blob = response.body!;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video_${job.id}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  }

  ngOnDestroy() {
    this.generationService.stopAllPolling();
  }
}
