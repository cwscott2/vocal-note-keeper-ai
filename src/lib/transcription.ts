// transcription.ts — Handles audio transcription across multiple providers.
//
// OpenAI Whisper calls are routed through /api/openai-transcribe (Vercel serverless proxy)
// when running in a Vercel deployment. In Lovable preview, they fall back to direct calls.
// Hugging Face and Whisper Web calls are unaffected (no OpenAI SDK involved).

export interface TranscriptionProvider {
  name: string;
  displayName: string;
  models: string[];
  requiresApiKey: boolean;
}

export const TRANSCRIPTION_PROVIDERS: TranscriptionProvider[] = [
  {
    name: 'whisper-web',
    displayName: 'Whisper Web (Local)',
    models: ['tiny', 'tiny.en', 'base', 'base.en', 'small', 'small.en'],
    requiresApiKey: false
  },
  {
    name: 'openai',
    displayName: 'OpenAI',
    models: ['whisper-1', 'gpt-4o-mini'],
    requiresApiKey: true
  },
  {
    name: 'huggingface',
    displayName: 'Hugging Face',
    models: [
      'openai/whisper-large-v3',
      'openai/whisper-large-v3-turbo', 
      'openai/whisper-medium',
      'openai/whisper-tiny'
    ],
    requiresApiKey: true
  }
];

// Detect whether the server-side proxy is available (Vercel deployment vs Lovable preview).
function getProxyBase(): string | null {
  if (typeof window === 'undefined') return null;
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('vercel.app') || origin.includes('127.0.0.1')) {
    return origin;
  }
  if (!origin.includes('lovable.app')) {
    return origin; // Custom domain — assume proxy is available
  }
  return null; // Lovable preview — fall back to direct call
}

export const transcribeWithOpenAI = async (audioBlob: Blob, apiKey: string, model: string = 'whisper-1'): Promise<string> => {
  const proxyBase = getProxyBase();

  console.log('Transcribing via OpenAI', proxyBase ? '(server proxy)' : '(direct — Lovable preview)');

  if (proxyBase) {
    // Route through server-side proxy
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', model);
    formData.append('response_format', 'text');
    formData.append('apiKey', apiKey); // Proxy extracts and strips this before forwarding

    const response = await fetch(`${proxyBase}/api/openai-transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI transcription proxy error:', errorText);
      throw new Error(`OpenAI transcription error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return await response.text();
  } else {
    // Lovable preview fallback — direct browser call
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', model);
    formData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    return await response.text();
  }
};

export const transcribeWithHuggingFace = async (audioBlob: Blob, apiKey: string, model: string): Promise<string> => {
  // Hugging Face calls go directly to api-inference.huggingface.co — no OpenAI SDK involved.
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'audio/flac',
    },
    body: audioBlob,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Hugging Face API error:', errorText);
    throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Hugging Face API error: ${result.error}`);
  }
  
  return result.text || result[0]?.text || 'Transcription failed - no text returned';
};

// Import and export the whisperWeb functions
import { checkWhisperWebSupport as canUseWhisperWeb, transcribeWithWhisperWeb } from './whisperWeb';

export { canUseWhisperWeb, transcribeWithWhisperWeb };

import { Settings } from './database';

export const transcribeAudio = async (audioBlob: Blob, settings: Settings): Promise<string> => {
  const { selectedProvider, selectedModel } = settings;

  switch (selectedProvider) {
    case 'openai':
      if (!settings.openaiApiKey) {
        throw new Error('OpenAI API key is required');
      }
      return await transcribeWithOpenAI(audioBlob, settings.openaiApiKey, selectedModel);

    case 'huggingface':
      if (!settings.huggingfaceApiKey) {
        throw new Error('Hugging Face API key is required');
      }
      return await transcribeWithHuggingFace(audioBlob, settings.huggingfaceApiKey, selectedModel);

    case 'whisper-web':
      return await transcribeWithWhisperWeb(audioBlob, selectedModel);

    default:
      throw new Error(`Unsupported transcription provider: ${selectedProvider}`);
  }
};
