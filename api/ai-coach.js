export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, project, history = [] } = req.body || {}
  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  }

  // Build system prompt with project context
  const projectContext = project
    ? `
Current project context:
- Project: ${project.name}
- Methodology: ${(project.type || 'dmaic').toUpperCase()}
- Current Phase: ${project.phase || 'Define'}
- Status: ${project.status || 'active'}
- Health: ${project.health || 'green'}
${project.description ? `- Description: ${project.description}` : ''}
${project.completion ? `- Progress: ${project.completion.completed}/${project.completion.total} sections complete (${project.completion.pct || 0}%)` : ''}`
    : ''

  const systemPrompt = `You are an AI Project Coach specializing in Lean Six Sigma, continuous improvement, and operational excellence. You help project teams execute improvement projects successfully.
${projectContext}

You provide:
- Phase-specific guidance: what to focus on right now in the current phase
- Help writing project artifacts: problem statements, goal statements, charter sections, SIPOC
- Clear explanations of LSS tools (FMEA, MSA, control charts, fishbone, etc.) and when to apply them
- Risk identification and practical mitigation strategies
- Best practices for stakeholder management and team alignment
- Coaching on removing roadblocks and keeping projects on track

Tone: concise, practical, action-oriented. Give specific, actionable advice tailored to this project. Keep responses under 300 words unless detail is specifically requested. Use bullet points for clarity.`

  // Keep last 10 messages to limit context size
  const recentHistory = history.slice(-10)
  const messages = [
    ...recentHistory.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ]

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return res.status(502).json({ error: 'AI service returned an error.' })
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text || ''
    return res.status(200).json({ reply })
  } catch (err) {
    console.error('AI coach error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
