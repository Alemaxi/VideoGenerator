import { Component, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { GenerateStateService } from '../../../../services/generate-state.service';

@Component({
  selector: 'app-image-to-video',
  templateUrl: './image-to-video.page.html',
  standalone: false,
})
export class ImageToVideoPage {
  state = inject(GenerateStateService);
  private toastCtrl = inject(ToastController);

  imageBase64 = signal<string | null>(null);
  imageMimeType = signal('image/jpeg');

  async generate() {
    if (!this.imageBase64()) {
      const toast = await this.toastCtrl.create({ message: 'Selecione uma imagem de entrada', duration: 3000, color: 'warning' });
      await toast.present();
      return;
    }
    this.state.generate({
      mode: 'image-to-video',
      imageBase64: this.imageBase64() ?? undefined,
      imageMimeType: this.imageMimeType(),
    });
  }
}
