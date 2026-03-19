import { Component, inject } from '@angular/core';
import { GenerateStateService } from '../../../../services/generate-state.service';

@Component({
  selector: 'app-text-to-video',
  templateUrl: './text-to-video.page.html',
  standalone: false,
})
export class TextToVideoPage {
  state = inject(GenerateStateService);
}
