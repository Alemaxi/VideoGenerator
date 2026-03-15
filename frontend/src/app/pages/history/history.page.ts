import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
})
export class HistoryPage implements OnInit {
  generations: any[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  filterType: string | undefined = undefined;
  isLoading = false;

  constructor(
    private api: ApiService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.isLoading = true;
    try {
      const result = await this.api.getGenerations(this.filterType, this.page, this.pageSize).toPromise();
      this.generations = result.items;
      this.total = result.total;
    } finally {
      this.isLoading = false;
    }
  }

  setFilter(type: string | undefined) {
    this.filterType = type;
    this.page = 1;
    this.load();
  }

  async deleteGeneration(id: number) {
    const alert = await this.alertCtrl.create({
      header: 'Remover',
      message: 'Remover este item do histórico?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Remover',
          role: 'destructive',
          handler: async () => {
            await this.api.deleteGeneration(id).toPromise();
            await this.load();
          }
        }
      ]
    });
    await alert.present();
  }

  statusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'danger';
      case 'processing': return 'warning';
      default: return 'medium';
    }
  }
}
