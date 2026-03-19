import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { GeneratePageRoutingModule } from './generate-routing.module';
import { GenerateComponentsModule } from './components/components.module';

import { GeneratePage } from './generate.page';
import { TextToVideoPage } from './pages/text-to-video/text-to-video.page';
import { ImageToVideoPage } from './pages/image-to-video/image-to-video.page';
import { FirstLastFramePage } from './pages/first-last-frame/first-last-frame.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    GeneratePageRoutingModule,
    GenerateComponentsModule,
  ],
  declarations: [
    GeneratePage,
    TextToVideoPage,
    ImageToVideoPage,
    FirstLastFramePage,
  ]
})
export class GeneratePageModule {}
