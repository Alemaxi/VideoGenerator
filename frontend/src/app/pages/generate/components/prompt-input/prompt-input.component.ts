import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-prompt-input',
  templateUrl: './prompt-input.component.html',
  standalone: false,
})
export class PromptInputComponent {
  @Input() prompt = '';
  @Input() negativePrompt = '';
  @Output() promptChange = new EventEmitter<string>();
  @Output() negativePromptChange = new EventEmitter<string>();
}
