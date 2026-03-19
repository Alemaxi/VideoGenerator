import { Component, OnDestroy, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { GenerationService } from '../../services/generation';
import { GenerateStateService } from '../../services/generate-state.service';

@Component({
  selector: 'app-generate',
  templateUrl: './generate.page.html',
  styleUrls: ['./generate.page.scss'],
  standalone: false,
})
export class GeneratePage implements OnDestroy {
  private router = inject(Router);
  private generationService = inject(GenerationService);
  state = inject(GenerateStateService);

  activeSegment = signal('text');

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        if (e.url.includes('/first-last')) this.activeSegment.set('first-last');
        else if (e.url.includes('/image'))  this.activeSegment.set('image');
        else                                this.activeSegment.set('text');
      });
  }

  navigate(segment: string | undefined) {
    if (segment) this.router.navigate(['/generate', segment]);
  }

  ngOnDestroy() {
    this.generationService.stopAllPolling();
  }
}
