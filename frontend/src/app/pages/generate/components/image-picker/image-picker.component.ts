import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-image-picker',
  templateUrl: './image-picker.component.html',
  standalone: false,
})
export class ImagePickerComponent {
  @Input() imageBase64: string | null = null;
  @Input() imageMimeType = 'image/jpeg';
  @Input() buttonLabel = 'Selecionar Imagem';
  @Input() buttonIcon = 'cloud-upload-outline';
  @Input() inputId = 'imagePicker';
  @Output() imageSelected = new EventEmitter<{ base64: string; mimeType: string }>();

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [meta, base64] = dataUrl.split(',');
      const mimeType = meta.split(':')[1].split(';')[0];
      this.imageSelected.emit({ base64, mimeType });
    };
    reader.readAsDataURL(file);
  }
}
