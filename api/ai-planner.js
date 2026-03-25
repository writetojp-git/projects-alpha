export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { description } = req.body || {}
  if (!description?.trim()) {
    return res.status(400).json({ error: 'Description is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  }

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
        max_tokens: 2048,
        system: `You are a Lean Six Sigma expert and project planning assistant. Given a short description of a business problem or improvement opportunity, generate a complete project brief.

Return ONLY valid JSON — no markdown, no explanation, no code fences. Use this exact structure:
{
  "name": "project name (5-8 words, title case)",
  "type": "dmaic or dmadv or kaizen or lean or general",
  "problem_statement": "clear 2-3 sentence problem statement describing the current state and impact",
  "goal_statement": "SMART 1-2 sentence goal: specific target, measurable outcome, time-bound",
  "sipoc_summary": "2-3 sentence overview: key suppliers, inputs, process, outputs, customers",
  "team_roles": ["Champion", "Project Lead", "Process Owner", "Data Analyst", "Subject Matter Expert"],
  "key_risks": ["risk 1", "risk 2", "risk 3"],
  "success_metrics": ["metric 1 with target", "metric 2 with target", "metric 3 with target"],
  "estimated_savings": "estimated annual savings or efficiency gain description",
  "department": "relevant department or functional area"
}

Choose project type based on:
- dmaic: existing broken process with measurable defects to fix
- dmadv: new process or product design needed from scratch
- kaizen: rapid improvement event (1–5 days), focused scope
- lean: waste elimination and flow improvement focus
- general: other improvement initiatives`,
        messages: [
          {
            role: 'user',
            content: `Generate a project brief for this improvement opportunity:\n\n${description}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return res.status(502).json({ error: 'AI service returned an error. Check server logs.' })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    let plan
    try {
      plan = JSON.parse(text)
    } catch {
      console.error('Failed to parse AI response as JSON:', text)
      return res.status(500).json({ error: 'AI returned invalid JSON. Please try again.' })
    }

    return res.status(200).json({ plan })
  } catch (err) {
    console.error('AI planner error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
