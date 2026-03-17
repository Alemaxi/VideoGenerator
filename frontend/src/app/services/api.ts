import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // API Keys
  getApiKeys() {
    return this.http.get<any[]>(`${this.baseUrl}/api/apikeys`);
  }

  createApiKey(data: { provider: string; keyValue: string; label?: string; projectId?: string; region?: string }) {
    return this.http.post(`${this.baseUrl}/api/apikeys`, data);
  }

  deleteApiKey(id: number) {
    return this.http.delete(`${this.baseUrl}/api/apikeys/${id}`);
  }

  updateApiKey(id: number, data: { keyValue?: string; label?: string; isActive?: boolean }) {
    return this.http.put(`${this.baseUrl}/api/apikeys/${id}`, data);
  }

  // Generations
  getGenerations(type?: string, page = 1, pageSize = 20) {
    const params: Record<string, any> = { page, pageSize };
    if (type) params['type'] = type;
    return this.http.get<any>(`${this.baseUrl}/api/generations`, { params });
  }

  generateVideo(request: {
    prompt: string;
    negativePrompt?: string;
    model?: string;
    durationSeconds?: number;
    aspectRatio?: string;
    enhancePrompt?: boolean;
    generateAudio?: boolean;
    mode?: 'text-to-video' | 'image-to-video' | 'first-last-frame';
    provider?: 'google-ai-studio' | 'vertex-ai';
    imageBase64?: string;
    imageMimeType?: string;
    firstFrameBase64?: string;
    firstFrameMimeType?: string;
    lastFrameBase64?: string;
    lastFrameMimeType?: string;
  }) {
    return this.http.post<any>(`${this.baseUrl}/api/generations/video`, request);
  }

  checkGenerationStatus(id: number) {
    return this.http.post<any>(`${this.baseUrl}/api/generations/${id}/check-status`, {});
  }

  downloadGeneration(id: number) {
    return this.http.get(`${this.baseUrl}/api/generations/${id}/download`, {
      responseType: 'blob',
      observe: 'response'
    });
  }

  deleteGeneration(id: number) {
    return this.http.delete(`${this.baseUrl}/api/generations/${id}`);
  }
}
