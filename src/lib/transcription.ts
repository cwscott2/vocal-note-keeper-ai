
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
    models: ['whisper-1', 'gpt-4o-mini', 'gpt-4o', 'gpt-4o-audio'],
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

export const transcribeWithOpenAI = async (audioBlob: Blob, apiKey: string, model: string = 'whisper-1'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', model);
  formData.append('response_format', 'text');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  return await response.text();
};

export const transcribeWithHuggingFace = async (audioBlob: Blob, apiKey: string, model: string): Promise<string> => {
  // Convert blob to base64 for HF API
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: base64
    }),
  });

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.text || 'Transcription failed';
};

// Use the enhanced support detection from whisperWeb
export { checkWhisperWebSupport as canUseWhisperWeb, transcribeWithWhisperWeb } from './whisperWeb';
