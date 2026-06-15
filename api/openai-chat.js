// api/openai-chat.js — Server-side proxy for OpenAI chat completions
// Accepts the user's own API key in the request body and forwards to OpenAI.
// This removes the need for `dangerouslyAllowBrowser: true` in the frontend.
//
// Request body:
//   { apiKey: string, model: string, messages: array, max_tokens?: number,
//     temperature?: number, response_format?: object }
//
// The user's key is never logged and is only used for the single upstream request.

const ALLOWED_MODELS = new Set([
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
])

const MAX_TOKENS_LIMIT = 4000

export default async function handler(req, res) {
  // CORS headers — allow the Lovable app origin and localhost
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { apiKey, model, messages, max_tokens, temperature, response_format } = req.body || {}

  // Validate API key presence
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk-')) {
    return res.status(400).json({
      error: { message: 'A valid OpenAI API key (sk-...) is required in the request body.', type: 'invalid_request' }
    })
  }

  // Validate required fields
  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: { message: 'model and messages are required.', type: 'invalid_request' }
    })
  }

  // Enforce model allowlist
  if (!ALLOWED_MODELS.has(model)) {
    return res.status(400).json({
      error: { message: `Model '${model}' is not permitted.`, type: 'invalid_request' }
    })
  }

  // Enforce token ceiling
  if (max_tokens && max_tokens > MAX_TOKENS_LIMIT) {
    return res.status(400).json({
      error: { message: `max_tokens exceeds the allowed limit of ${MAX_TOKENS_LIMIT}.`, type: 'invalid_request' }
    })
  }

  const requestBody = {
    model,
    messages,
    ...(max_tokens !== undefined && { max_tokens }),
    ...(temperature !== undefined && { temperature }),
    ...(response_format !== undefined && { response_format }),
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()
    return res.status(response.status).json(data)

  } catch (error) {
    console.error('[openai-chat proxy] Upstream fetch failed:', error.message)
    return res.status(500).json({
      error: { message: 'Proxy error — could not reach OpenAI API.', type: 'proxy_error' }
    })
  }
}
