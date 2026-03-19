import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GeneratePage } from './generate.page';
import { TextToVideoPage } from './pages/text-to-video/text-to-video.page';
import { ImageToVideoPage } from './pages/image-to-video/image-to-video.page';
import { FirstLastFramePage } from './pages/first-last-frame/first-last-frame.page';

const routes: Routes = [
  {
    path: '',
    component: GeneratePage,
    children: [
      { path: '',           redirectTo: 'text', pathMatch: 'full' },
      { path: 'text',       component: TextToVideoPage },
      { path: 'image',      component: ImageToVideoPage },
      { path: 'first-last', component: FirstLastFramePage },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GeneratePageRoutingModule {}
