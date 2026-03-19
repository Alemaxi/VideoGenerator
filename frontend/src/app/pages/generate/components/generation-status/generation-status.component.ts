import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GenerationJob } from '../../../../services/generation';

@Component({
  selector: 'app-generation-status',
  templateUrl: './generation-status.component.html',
  standalone: false,
})
export class GenerationStatusComponent {
  @Input() job: GenerationJob | null = null;
  @Input() statusLabel = '';
  @Output() download = new EventEmitter<void>();
}
