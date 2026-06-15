// api/openai-transcribe.js — Server-side proxy for OpenAI audio transcriptions
// Accepts the user's own API key and audio file, forwards to OpenAI Whisper API.
// This removes the direct browser → OpenAI call in transcription.ts.
//
// This endpoint receives multipart/form-data with:
//   - file: the audio blob
//   - model: e.g. 'whisper-1'
//   - response_format: e.g. 'text'
//   - apiKey: the user's OpenAI key (as a form field)
//
// Vercel automatically parses multipart bodies when bodyParser is disabled.

export const config = {
  api: {
    bodyParser: false, // Required for multipart/form-data (audio file upload)
  },
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Read the raw request body and forward it directly to OpenAI
    // We need to extract the apiKey from the form data before forwarding
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const rawBody = Buffer.concat(chunks)

    // Extract the Content-Type header (includes boundary for multipart)
    const contentType = req.headers['content-type'] || ''

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' })
    }

    // Parse the multipart body to extract the apiKey field
    // We use a simple boundary-based parser to find the apiKey without a full library
    const boundary = contentType.split('boundary=')[1]?.trim()
    if (!boundary) {
      return res.status(400).json({ error: 'Missing multipart boundary' })
    }

    // Extract apiKey from form data
    const bodyStr = rawBody.toString('binary')
    const apiKeyMatch = bodyStr.match(/name="apiKey"\r\n\r\n([^\r\n]+)/)
    const apiKey = apiKeyMatch?.[1]?.trim()

    if (!apiKey || !apiKey.startsWith('sk-')) {
      return res.status(400).json({
        error: { message: 'A valid OpenAI API key (sk-...) is required as a form field named "apiKey".', type: 'invalid_request' }
      })
    }

    // Build a new FormData body without the apiKey field for forwarding to OpenAI
    // We reconstruct the multipart body, stripping the apiKey part
    const parts = rawBody.toString('binary').split(`--${boundary}`)
    const filteredParts = parts.filter(part => {
      return !part.includes('name="apiKey"')
    })
    const newBody = filteredParts.join(`--${boundary}`)
    const newBodyBuffer = Buffer.from(newBody, 'binary')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': contentType,
      },
      body: newBodyBuffer,
    })

    const text = await response.text()
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/plain')
    return res.status(response.status).send(text)

  } catch (error) {
    console.error('[openai-transcribe proxy] Error:', error.message)
    return res.status(500).json({
      error: { message: 'Proxy error — could not reach OpenAI transcription API.', type: 'proxy_error' }
    })
  }
}
