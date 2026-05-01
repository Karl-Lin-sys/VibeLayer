export interface Wallpaper {
  id: string;
  url: string;
  prompt: string;
  vibe: string;
  timestamp: number;
}

export type GenerationStatus = 'idle' | 'generating' | 'error';
