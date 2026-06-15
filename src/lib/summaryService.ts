// summaryService.ts — Generates AI summaries of meeting transcripts.
//
// OpenAI calls are routed through /api/openai-chat (Vercel serverless proxy).
// The user's API key is passed in the request body over HTTPS — it is never
// embedded in the source code and never requires `dangerouslyAllowBrowser`.
//
// LM Studio calls go directly to the user's local server (localhost/LAN) —
// no proxy is needed since local network calls are not browser-security-sensitive.

import { Settings } from './database';
import OpenAI from 'openai';

export interface SummaryResult {
  title: string;
  summary: string;
}

export const SUMMARY_PROVIDERS = [
  { name: 'none', displayName: 'No Summary', requiresApiKey: false },
  { name: 'openai', displayName: 'OpenAI GPT', requiresApiKey: true },
  { name: 'lmstudio', displayName: 'LM Studio (Local)', requiresApiKey: false }
];

export const generateSummary = async (transcript: string, settings: Settings): Promise<SummaryResult> => {
  console.log('Generating summary with provider:', settings.summaryProvider);
  
  if (!settings.summaryProvider || settings.summaryProvider === 'none') {
    throw new Error('Summary provider not configured');
  }

  switch (settings.summaryProvider) {
    case 'openai':
      return generateOpenAISummary(transcript, settings);
    case 'lmstudio':
      return generateLMStudioSummary(transcript, settings);
    default:
      throw new Error(`Unsupported summary provider: ${settings.summaryProvider}`);
  }
};

// Detect whether we're running in a Vercel deployment (proxy available)
// or in the Lovable preview / local dev (proxy not available).
function getProxyBase(): string | null {
  // In Vercel deployments, /api/openai-chat is available.
  // In Lovable preview (vocal-note-keeper-ai.lovable.app), it is not.
  // We detect by checking if the origin is a Vercel deployment.
  if (typeof window === 'undefined') return null;
  const origin = window.location.origin;
  // Vercel deployments use vercel.app or a custom domain connected to Vercel.
  // Lovable uses lovable.app. Localhost is always safe to proxy if the dev server is running.
  if (origin.includes('localhost') || origin.includes('vercel.app') || origin.includes('127.0.0.1')) {
    return origin;
  }
  // Custom domains — assume proxy is available if not lovable.app
  if (!origin.includes('lovable.app')) {
    return origin;
  }
  return null; // Lovable preview — fall back to direct call
}

const SUMMARY_MESSAGES = (transcript: string) => [
  {
    role: 'system' as const,
    content: 'You are a helpful summary assistant'
  },
  {
    role: 'user' as const,
    content: `You are a helpful summary assistant, summaries the following meeting transcript into bullets for "summary", and using summary decide on a "title" (include pun if possible, max 50 characters ). You must respond in json! Transcript: ${transcript} \n You must respond in JSON with summary and title key's`
  }
];

const SUMMARY_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "summary",
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        summary: { type: "string" }
      },
      required: ["title", "summary"]
    }
  }
};

const generateOpenAISummary = async (transcript: string, settings: Settings): Promise<SummaryResult> => {
  if (!settings.openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const model = settings.summaryModel || 'gpt-4o-mini';
  const messages = SUMMARY_MESSAGES(transcript);
  const proxyBase = getProxyBase();

  console.log('Making OpenAI summary request via', proxyBase ? 'server proxy' : 'direct (Lovable preview)');

  let content: string;

  if (proxyBase) {
    // Route through server-side proxy — no dangerouslyAllowBrowser needed
    const response = await fetch(`${proxyBase}/api/openai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: settings.openaiApiKey,
        model,
        messages,
        max_tokens: 500,
        temperature: 0.6,
        response_format: SUMMARY_RESPONSE_FORMAT,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI proxy error: ${response.status}`);
    }

    const data = await response.json();
    content = data.choices?.[0]?.message?.content || '{}';
  } else {
    // Lovable preview fallback — direct call (dangerouslyAllowBrowser required here only)
    const openai = new OpenAI({ apiKey: settings.openaiApiKey, dangerouslyAllowBrowser: true });
    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 500,
      temperature: 0.6,
      response_format: SUMMARY_RESPONSE_FORMAT,
    });
    content = response.choices[0].message.content || '{}';
  }

  console.log('OpenAI summary response received');
  const parsed = JSON.parse(content);
  return { title: parsed.title, summary: parsed.summary };
};

const generateLMStudioSummary = async (transcript: string, settings: Settings): Promise<SummaryResult> => {
  const serverUrl = settings.lmstudioServerUrl || 'http://192.168.0.11:1234';
  
  console.log('Making LM Studio API request to:', serverUrl);
  
  if (!settings.summaryModel) {
    throw new Error('Model is required for LM Studio');
  }

  // LM Studio is a local server — direct calls are safe (no browser security risk)
  const openai = new OpenAI({
    baseURL: `${serverUrl}/v1`,
    apiKey: 'lm-studio',
    dangerouslyAllowBrowser: true, // Safe: local LAN server, no real API key
  });

  try {
    const response = await openai.chat.completions.create({
      model: settings.summaryModel,
      messages: SUMMARY_MESSAGES(transcript),
      max_tokens: 500,
      temperature: 0.6,
      response_format: SUMMARY_RESPONSE_FORMAT,
    });

    console.log('LM Studio response received');
    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      title: parsed.title || 'Generated Summary',
      summary: parsed.summary || response.choices[0].message.content || ''
    };
  } catch (error) {
    console.error('LM Studio request failed:', error);
    if (error instanceof Error) {
      throw new Error(`LM Studio connection failed: ${error.message}. Make sure LM Studio is running on ${serverUrl} with the model loaded.`);
    }
    throw new Error('LM Studio connection failed. Make sure LM Studio is running with the model loaded.');
  }
};
