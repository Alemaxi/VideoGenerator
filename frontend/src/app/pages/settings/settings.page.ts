import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  apiKeys: any[] = [];
  newKeyValue = '';
  newKeyLabel = '';
  isAdding = false;

  constructor(
    private api: ApiService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadKeys();
  }

  async loadKeys() {
    this.apiKeys = await this.api.getApiKeys().toPromise() ?? [];
  }

  async addKey() {
    if (!this.newKeyValue.trim()) return;
    this.isAdding = true;
    try {
      await this.api.createApiKey({
        provider: 'google',
        keyValue: this.newKeyValue,
        label: this.newKeyLabel || undefined,
      }).toPromise();
      this.newKeyValue = '';
      this.newKeyLabel = '';
      await this.loadKeys();
      const toast = await this.toastCtrl.create({ message: 'Chave adicionada!', duration: 2000, color: 'success' });
      await toast.present();
    } finally {
      this.isAdding = false;
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
            await this.api.deleteApiKey(id).toPromise();
            await this.loadKeys();
          }
        }
      ]
    });
    await alert.present();
  }

  async toggleActive(key: any) {
    await this.api.updateApiKey(key.id, { isActive: !key.isActive }).toPromise();
    await this.loadKeys();
  }
}
