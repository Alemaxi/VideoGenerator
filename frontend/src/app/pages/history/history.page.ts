import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: false,
})
export class HistoryPage implements OnInit {
  private api = inject(ApiService);
  private alertCtrl = inject(AlertController);

  generations = signal<any[]>([]);
  total = signal(0);
  filterType = signal<string | undefined>(undefined);
  isLoading = signal(false);

  private page = 1;
  private pageSize = 20;

  ngOnInit() {
    this.load();
  }

  async load() {
    this.isLoading.set(true);
    try {
      const result = await firstValueFrom(this.api.getGenerations(this.filterType(), this.page, this.pageSize));
      this.generations.set(result.items);
      this.total.set(result.total);
    } finally {
      this.isLoading.set(false);
    }
  }

  setFilter(type: string | undefined) {
    this.filterType.set(type);
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
            await firstValueFrom(this.api.deleteGeneration(id));
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
