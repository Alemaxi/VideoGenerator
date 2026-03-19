import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-video-settings',
  templateUrl: './video-settings.component.html',
  standalone: false,
})
export class VideoSettingsComponent {
  @Input() providers: { id: string; label: string }[] = [];
  @Input() provider = '';
  @Input() models: { value: string; label: string }[] = [];
  @Input() model = '';
  @Input() durationOptions: { value: number; label: string }[] = [];
  @Input() durationSeconds = 8;
  @Input() aspectRatios: { value: string; label: string }[] = [];
  @Input() aspectRatio = '';

  @Output() providerChange = new EventEmitter<string>();
  @Output() modelChange = new EventEmitter<string>();
  @Output() durationSecondsChange = new EventEmitter<number>();
  @Output() aspectRatioChange = new EventEmitter<string>();
}
