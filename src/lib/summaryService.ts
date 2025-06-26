
import { openai } from './transcription';

export interface SummaryProvider {
  name: string;
  displayName: string;
  requiresApiKey: boolean;
  models?: string[];
}

export const SUMMARY_PROVIDERS: SummaryProvider[] = [
  {
    name: 'none',
    displayName: 'Switch Off Summaries/None',
    requiresApiKey: false
  },
  {
    name: 'huggingface',
    displayName: 'HuggingFace (Free, But Slow)',
    requiresApiKey: true,
    models: ['Falconsai/text_summarization']
  },
  {
    name: 'openai',
    displayName: 'OpenAI (Best & Paid)',
    requiresApiKey: true,
    models: ['gpt-4o-mini', 'gpt-4.1-nano']
  },
  {
    name: 'ollama',
    displayName: 'Ollama (Free & Local)',
    requiresApiKey: false,
    models: ['llama3.1:8b']
  },
  {
    name: 'lmstudio',
    displayName: 'LM Studio (Free & Local)',
    requiresApiKey: false,
    models: ['google/gemma-3-4b']
  }
];

export const summarizeWithOpenAI = async (text: string, apiKey: string, model: string = 'gpt-4.1-nano'): Promise<string> => {
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }

  openai.apiKey = apiKey;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: `You are a helpful summary assistant, summarize the following in bullet points, only respond with bullet points: ${text}`
      }
    ],
    max_tokens: 500,
    temperature: 0.3
  });

  return response.choices[0]?.message?.content || 'Summary generation failed';
};

export const summarizeWithHuggingFace = async (text: string, apiKey: string, model: string = 'Falconsai/text_summarization'): Promise<string> => {
  const response = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: text
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Hugging Face API error: ${result.error}`);
  }
  
  return result[0]?.summary_text || result.summary_text || 'Summary generation failed';
};

export const summarizeWithOllama = async (text: string, model: string, serverUrl: string = 'http://localhost:11434'): Promise<string> => {
  const response = await fetch(`${serverUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: `You are a helpful summary assistant, summarize the following in bullet points, only respond with bullet points: ${text}`,
      stream: false
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.response || 'Summary generation failed';
};

export const summarizeWithLMStudio = async (text: string, model: string, serverUrl: string = 'http://192.168.0.11:1234'): Promise<string> => {
  const response = await fetch(`${serverUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: `You are a helpful summary assistant, summarize the following in bullet points, only respond with bullet points: ${text}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    }),
  });

  if (!response.ok) {
    throw new Error(`LM Studio API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content || 'Summary generation failed';
};

export const generateSummary = async (
  text: string,
  provider: string,
  model: string,
  apiKey?: string,
  serverUrl?: string
): Promise<string> => {
  switch (provider) {
    case 'openai':
      if (!apiKey) throw new Error('OpenAI API key is required');
      return await summarizeWithOpenAI(text, apiKey, model);
    
    case 'huggingface':
      if (!apiKey) throw new Error('Hugging Face API key is required');
      return await summarizeWithHuggingFace(text, apiKey, model);
    
    case 'ollama':
      return await summarizeWithOllama(text, model, serverUrl);
    
    case 'lmstudio':
      return await summarizeWithLMStudio(text, model, serverUrl);
    
    default:
      throw new Error(`Unsupported summary provider: ${provider}`);
  }
};
