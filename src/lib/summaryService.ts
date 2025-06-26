
import { Settings } from './database';

export interface SummaryResult {
  title: string;
  summary: string;
}

export const generateSummary = async (transcript: string, settings: Settings): Promise<SummaryResult> => {
  if (!settings.summaryProvider || settings.summaryProvider === 'none') {
    throw new Error('Summary provider not configured');
  }

  switch (settings.summaryProvider) {
    case 'openai':
      return generateOpenAISummary(transcript, settings);
    case 'huggingface':
      return generateHuggingFaceSummary(transcript, settings);
    case 'ollama':
      return generateOllamaSummary(transcript, settings);
    case 'lmstudio':
      return generateLMStudioSummary(transcript, settings);
    default:
      throw new Error(`Unsupported summary provider: ${settings.summaryProvider}`);
  }
};

const generateOpenAISummary = async (transcript: string, settings: Settings): Promise<SummaryResult> => {
  if (!settings.openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.summaryModel || 'gpt-4.1-nano',
      messages: [
        {
          role: 'user',
          content: `Please analyze this transcript and provide a title and summary. Respond with JSON containing "title" and "summary" fields. The summary should be in bullet point format using markdown.\n\nTranscript: ${transcript}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "summary_response",
          schema: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "A concise title for the recording"
              },
              summary: {
                type: "string",
                description: "A bullet-point summary in markdown format"
              }
            },
            required: ["title", "summary"]
          }
        }
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const result = await response.json();
  const parsed = JSON.parse(result.choices[0].message.content);
  
  return {
    title: parsed.title,
    summary: parsed.summary
  };
};

const generateHuggingFaceSummary = async (transcript: string, settings: Settings): Promise<SummaryResult> => {
  if (!settings.hfApiKey) {
    throw new Error('HuggingFace API key not configured');
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${settings.summaryModel || 'Falconsai/text_summarization'}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.hfApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: transcript
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const result = await response.json();
  const summaryText = Array.isArray(result) ? result[0]?.summary_text || result[0]?.generated_text : result.summary_text || result.generated_text;
  
  if (!summaryText) {
    throw new Error('No summary returned from HuggingFace');
  }

  // Extract title from first line or create one
  const lines = summaryText.split('\n').filter(line => line.trim());
  const title = lines[0]?.length > 50 ? 'Generated Summary' : lines[0] || 'Generated Summary';
  
  return {
    title,
    summary: `# Summary\n\n${summaryText}`
  };
};

const generateOllamaSummary = async (transcript: string, settings: Settings): Promise<SummaryResult> => {
  const serverUrl = settings.ollamaServerUrl || 'http://localhost:11434';
  
  const response = await fetch(`${serverUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.summaryModel || 'llama3.1:8b',
      messages: [
        {
          role: 'user',
          content: `Please analyze this transcript and provide a title and summary in JSON format with "title" and "summary" fields. The summary should be in bullet point format using markdown.\n\nTranscript: ${transcript}`
        }
      ],
      stream: false,
      format: 'json'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const result = await response.json();
  let parsed;
  
  try {
    parsed = typeof result.message.content === 'string' 
      ? JSON.parse(result.message.content) 
      : result.message.content;
  } catch (error) {
    // Fallback if JSON parsing fails
    const content = result.message.content;
    return {
      title: 'Ollama Summary',
      summary: `# Summary\n\n${content}`
    };
  }
  
  return {
    title: parsed.title || 'Generated Summary',
    summary: parsed.summary || parsed.content || result.message.content
  };
};

const generateLMStudioSummary = async (transcript: string, settings: Settings): Promise<SummaryResult> => {
  const serverUrl = settings.lmstudioServerUrl || 'http://192.168.0.11:1234';
  
  const response = await fetch(`${serverUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.summaryModel || 'google/gemma-3-4b',
      messages: [
        {
          role: 'user',
          content: `Please analyze this transcript and provide a title and summary in JSON format with "title" and "summary" fields. The summary should be in bullet point format using markdown.\n\nTranscript: ${transcript}`
        }
      ],
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LM Studio API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const result = await response.json();
  let parsed;
  
  try {
    parsed = JSON.parse(result.choices[0].message.content);
  } catch (error) {
    // Fallback if JSON parsing fails
    const content = result.choices[0].message.content;
    return {
      title: 'LM Studio Summary',
      summary: `# Summary\n\n${content}`
    };
  }
  
  return {
    title: parsed.title || 'Generated Summary',
    summary: parsed.summary || parsed.content || result.choices[0].message.content
  };
};
