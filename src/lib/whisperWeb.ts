
// Whisper Web implementation for local transcription
export interface WhisperWebModel {
  name: string;
  size: number; // in MB
  url: string;
}

export const WHISPER_MODELS: WhisperWebModel[] = [
  { name: 'tiny', size: 76, url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-tiny.bin' },
  { name: 'tiny.en', size: 38, url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-tiny.en.bin' },
  { name: 'base', size: 142, url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-base.bin' },
  { name: 'base.en', size: 74, url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-base.en.bin' },
  { name: 'small', size: 488, url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-small.bin' },
  { name: 'small.en', size: 244, url: 'https://huggingface.co/ggml-org/whisper.cpp/resolve/main/ggml-small.en.bin' }
];

export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Enhanced SharedArrayBuffer detection based on whisper.cpp requirements
export const checkWhisperWebSupport = (): { supported: boolean; reason?: string; details?: string } => {
  // Check for SharedArrayBuffer
  if (typeof SharedArrayBuffer === 'undefined') {
    return { 
      supported: false, 
      reason: 'SharedArrayBuffer not available',
      details: 'Requires Cross-Origin-Opener-Policy: same-origin-allow-popups and Cross-Origin-Embedder-Policy: require-corp headers'
    };
  }
  
  // Check cross-origin isolation
  if (!crossOriginIsolated) {
    return { 
      supported: false, 
      reason: 'Not cross-origin isolated',
      details: 'Current headers may not be properly configured. Check browser network tab for COOP/COEP headers.'
    };
  }

  // Check for WebAssembly support
  if (typeof WebAssembly === 'undefined') {
    return {
      supported: false,
      reason: 'WebAssembly not supported',
      details: 'Browser does not support WebAssembly which is required for whisper.cpp'
    };
  }

  // Additional checks for whisper.cpp specific requirements
  try {
    // Test SharedArrayBuffer creation
    const testBuffer = new SharedArrayBuffer(1024);
    if (testBuffer.byteLength !== 1024) {
      return {
        supported: false,
        reason: 'SharedArrayBuffer creation failed',
        details: 'Unable to create SharedArrayBuffer with expected size'
      };
    }
  } catch (error) {
    return {
      supported: false,
      reason: 'SharedArrayBuffer test failed',
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
  
  return { supported: true };
};

export const downloadWhisperModel = async (
  modelName: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<ArrayBuffer> => {
  const model = WHISPER_MODELS.find(m => m.name === modelName);
  if (!model) {
    throw new Error(`Model ${modelName} not found`);
  }

  // Add CORS headers for model download
  const response = await fetch(model.url, {
    mode: 'cors',
    credentials: 'omit'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to download model: ${response.statusText}`);
  }

  const total = parseInt(response.headers.get('content-length') || '0');
  const reader = response.body?.getReader();
  
  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    chunks.push(value);
    loaded += value.length;
    
    if (onProgress && total > 0) {
      onProgress({
        loaded,
        total,
        percentage: Math.round((loaded / total) * 100)
      });
    }
  }

  // Combine chunks into single ArrayBuffer
  const buffer = new ArrayBuffer(loaded);
  const uint8Array = new Uint8Array(buffer);
  let offset = 0;
  
  for (const chunk of chunks) {
    uint8Array.set(chunk, offset);
    offset += chunk.length;
  }

  return buffer;
};

export const storeModelInCache = async (modelName: string, buffer: ArrayBuffer): Promise<void> => {
  const cache = await caches.open('whisper-models');
  const response = new Response(buffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  });
  await cache.put(`/models/${modelName}`, response);
};

export const getModelFromCache = async (modelName: string): Promise<ArrayBuffer | null> => {
  try {
    const cache = await caches.open('whisper-models');
    const response = await cache.match(`/models/${modelName}`);
    return response ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
};

export const transcribeWithWhisperWeb = async (
  audioBlob: Blob,
  modelName: string = 'tiny'
): Promise<string> => {
  const support = checkWhisperWebSupport();
  if (!support.supported) {
    throw new Error(`Whisper Web not supported: ${support.reason}. ${support.details || ''}`);
  }

  console.log('Transcribing with Whisper Web...', { audioBlob, modelName });
  
  // Check if model is available in cache
  let modelBuffer = await getModelFromCache(modelName);
  if (!modelBuffer) {
    console.log(`Model ${modelName} not found in cache, downloading...`);
    modelBuffer = await downloadWhisperModel(modelName);
    await storeModelInCache(modelName, modelBuffer);
  }
  
  // Simulate processing time for now
  // In a real implementation, this would use the whisper.cpp WebAssembly module
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return mock transcription with model info
  return `[Whisper Web - ${modelName}] This is a mock transcription from Whisper Web using the ${modelName} model. The actual implementation would process the audio through whisper.cpp WebAssembly module with the downloaded model.`;
};
