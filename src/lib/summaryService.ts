import { Settings } from './database';

export interface SummaryResult {
  title: string;
  summary: string;
}

export const SUMMARY_PROVIDERS = [
  { name: 'none', displayName: 'No Summary', requiresApiKey: false },
  { name: 'openai', displayName: 'OpenAI GPT', requiresApiKey: true },
  { name: 'huggingface', displayName: 'Hugging Face', requiresApiKey: true },
  { name: 'ollama', displayName: 'Ollama (Local)', requiresApiKey: false },
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

  console.log('Making OpenAI API request...');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.summaryModel || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Please analyze this transcript and provide a title and summary. The summary should be in bullet point format using markdown.\n\nTranscript: ${transcript}`
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
    console.error('OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  const result = await response.json();
  console.log('OpenAI response:', result);
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

  const lines = summaryText.split('\n').filter(line => line.trim());
  const title = lines[0]?.length > 50 ? 'Generated Summary' : lines[0] || 'Generated Summary';
  
  return {
    title,
    summary: `# Summary\n\n${summaryText}`
  };
};

const generateOllamaSummary = async (transcript: string, settings: Settings): Promise<SummaryResult> => {
  const serverUrl = settings.ollamaServerUrl || 'http://localhost:11434';
  
  console.log('Making Ollama API request to:', serverUrl);
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
  const serverUrl = settings.lmstudioServerUrl || 'http://localhost:1234';
  
  console.log('Making LM Studio API request to:', serverUrl);
  
  try {
    const response = await fetch(`${serverUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.summaryModel || 'local-model',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise summaries. Always respond with valid JSON containing "title" and "summary" fields.'
          },
          {
            role: 'user',
            content: `Please analyze this transcript and provide a title and summary. Return your response as JSON with "title" and "summary" fields. The summary should be in bullet point format using markdown.\n\nTranscript: ${transcript}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
    }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LM Studio API error response:', errorText);
      throw new Error(`LM Studio API error: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const result = await response.json();
    console.log('LM Studio raw response:', result);
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Invalid response format from LM Studio');
    }

    const content = result.choices[0].message.content;
    console.log('LM Studio content:', content);
    
    let parsed;
    try {
      // Try to parse as JSON first
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.log('Failed to parse as JSON, treating as plain text');
      // If JSON parsing fails, create a simple response
      return {
        title: 'LM Studio Summary',
        summary: `# Summary\n\n${content}`
      };
    }
    
    return {
      title: parsed.title || 'Generated Summary',
      summary: parsed.summary || content
    };
  } catch (error) {
    console.error('LM Studio request failed:', error);
    if (error instanceof Error) {
      throw new Error(`LM Studio connection failed: ${error.message}. Make sure LM Studio is running on ${serverUrl} with a model loaded.`);
    }
    throw new Error('LM Studio connection failed. Make sure LM Studio is running with a model loaded.');
  }
};
