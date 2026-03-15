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
  newKeyValue = signal('');
  newKeyLabel = signal('');
  isAdding = signal(false);

  ngOnInit() {
    this.loadKeys();
  }

  async loadKeys() {
    const keys = await firstValueFrom(this.api.getApiKeys());
    this.apiKeys.set(keys ?? []);
  }

  async addKey() {
    if (!this.newKeyValue().trim()) return;
    this.isAdding.set(true);
    try {
      await firstValueFrom(this.api.createApiKey({
        provider: 'google',
        keyValue: this.newKeyValue(),
        label: this.newKeyLabel() || undefined,
      }));
      this.newKeyValue.set('');
      this.newKeyLabel.set('');
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
}
