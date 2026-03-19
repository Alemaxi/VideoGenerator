import { Component, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { GenerateStateService } from '../../../../services/generate-state.service';

@Component({
  selector: 'app-first-last-frame',
  templateUrl: './first-last-frame.page.html',
  standalone: false,
})
export class FirstLastFramePage {
  state = inject(GenerateStateService);
  private toastCtrl = inject(ToastController);

  firstFrameBase64 = signal<string | null>(null);
  firstFrameMimeType = signal('image/jpeg');
  lastFrameBase64 = signal<string | null>(null);
  lastFrameMimeType = signal('image/jpeg');

  async generate() {
    if (!this.firstFrameBase64() || !this.lastFrameBase64()) {
      const toast = await this.toastCtrl.create({ message: 'Selecione o primeiro e o último frame', duration: 3000, color: 'warning' });
      await toast.present();
      return;
    }
    this.state.generate({
      mode: 'first-last-frame',
      firstFrameBase64: this.firstFrameBase64() ?? undefined,
      firstFrameMimeType: this.firstFrameMimeType(),
      lastFrameBase64: this.lastFrameBase64() ?? undefined,
      lastFrameMimeType: this.lastFrameMimeType(),
    });
  }
}
