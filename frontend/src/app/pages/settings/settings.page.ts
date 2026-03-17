import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit {
  private api = inject(ApiService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  apiKeys = signal<any[]>([]);
  newProvider = signal<'google-ai-studio' | 'vertex-ai'>('google-ai-studio');
  newKeyValue = signal('');
  newKeyLabel = signal('');
  newProjectId = signal('');
  newRegion = signal('us-central1');
  isAdding = signal(false);

  ngOnInit() {
    this.loadKeys();
  }

  async loadKeys() {
    const keys = await firstValueFrom(this.api.getApiKeys());
    this.apiKeys.set(keys ?? []);
  }

  setProvider(value: string | undefined) {
    this.newProvider.set(value === 'vertex-ai' ? 'vertex-ai' : 'google-ai-studio');
  }

  async addKey() {
    if (!this.newKeyValue().trim()) return;

    if (this.newProvider() === 'vertex-ai' && !this.newProjectId().trim()) {
      const toast = await this.toastCtrl.create({ message: 'Project ID é obrigatório para Vertex AI', duration: 3000, color: 'warning' });
      await toast.present();
      return;
    }

    this.isAdding.set(true);
    try {
      await firstValueFrom(this.api.createApiKey({
        provider: this.newProvider(),
        keyValue: this.newKeyValue(),
        label: this.newKeyLabel() || undefined,
        projectId: this.newProvider() === 'vertex-ai' ? this.newProjectId() : undefined,
        region: this.newProvider() === 'vertex-ai' ? this.newRegion() : undefined,
      }));
      this.newKeyValue.set('');
      this.newKeyLabel.set('');
      this.newProjectId.set('');
      this.newRegion.set('us-central1');
      await this.loadKeys();
      const toast = await this.toastCtrl.create({ message: 'Chave adicionada!', duration: 2000, color: 'success' });
      await toast.present();
    } finally {
      this.isAdding.set(false);
    }
  }

  async deleteKey(id: number) {
    const alert = await this.alertCtrl.create({
      header: 'Remover chave',
      message: 'Tem certeza que deseja remover esta chave de API?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Remover',
          role: 'destructive',
          handler: async () => {
            await firstValueFrom(this.api.deleteApiKey(id));
            await this.loadKeys();
          }
        }
      ]
    });
    await alert.present();
  }

  async toggleActive(key: any) {
    await firstValueFrom(this.api.updateApiKey(key.id, { isActive: !key.isActive }));
    await this.loadKeys();
  }

  providerLabel(provider: string) {
    return provider === 'vertex-ai' ? 'Vertex AI' : 'Google AI Studio';
  }

  providerColor(provider: string) {
    return provider === 'vertex-ai' ? 'tertiary' : 'primary';
  }
}
