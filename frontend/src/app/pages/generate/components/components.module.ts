import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PromptInputComponent } from './prompt-input/prompt-input.component';
import { ImagePickerComponent } from './image-picker/image-picker.component';
import { VideoSettingsComponent } from './video-settings/video-settings.component';
import { GenerationStatusComponent } from './generation-status/generation-status.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule],
  declarations: [
    PromptInputComponent,
    ImagePickerComponent,
    VideoSettingsComponent,
    GenerationStatusComponent,
  ],
  exports: [
    PromptInputComponent,
    ImagePickerComponent,
    VideoSettingsComponent,
    GenerationStatusComponent,
  ],
})
export class GenerateComponentsModule {}
