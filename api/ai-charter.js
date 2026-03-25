export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { project, intake } = req.body || {}
  if (!project?.name) {
    return res.status(400).json({ error: 'Project data is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  }

  const userContent = `Generate a complete project charter for the following project:

Project Name: ${project.name}
Project Type: ${project.type || 'DMAIC'}
Description: ${project.description || 'Not provided'}
Current Phase: ${project.phase || 'Define'}
${intake?.problem_statement ? `Problem Statement (from intake): ${intake.problem_statement}` : ''}
${intake?.business_case ? `Business Case (from intake): ${intake.business_case}` : ''}
${intake?.expected_benefit ? `Expected Benefit (from intake): ${intake.expected_benefit}` : ''}`

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
        system: `You are a Lean Six Sigma expert. Generate a complete project charter as JSON. Return ONLY valid JSON — no markdown fences, no explanation, no preamble. Use this exact structure:
{
  "problem_statement": "Clear 2-3 sentence problem statement describing current state, impact, and why it matters",
  "goal_statement": "SMART goal: specific, measurable, achievable, relevant, time-bound — 1-2 sentences with quantified targets",
  "business_case": "2-3 sentences explaining the financial/operational justification and strategic alignment",
  "scope_in": "Line 1: what is included\nLine 2: what is included\nLine 3: what is included",
  "scope_out": "Line 1: what is excluded\nLine 2: what is excluded\nLine 3: what is excluded",
  "success_metrics": [
    {"metric": "metric name", "target": "specific target value", "baseline": "current baseline value"},
    {"metric": "metric name", "target": "specific target value", "baseline": "current baseline value"},
    {"metric": "metric name", "target": "specific target value", "baseline": "current baseline value"}
  ],
  "milestones": [
    {"name": "milestone name", "description": "what will be accomplished", "weeks_from_start": 2},
    {"name": "milestone name", "description": "what will be accomplished", "weeks_from_start": 4},
    {"name": "milestone name", "description": "what will be accomplished", "weeks_from_start": 8},
    {"name": "milestone name", "description": "what will be accomplished", "weeks_from_start": 12}
  ],
  "team_assignments": [
    {"role": "Project Sponsor", "responsibilities": "Provide resources, remove barriers, approve phase gates"},
    {"role": "Project Lead", "responsibilities": "Day-to-day project execution, team coordination, reporting"},
    {"role": "Process Owner", "responsibilities": "Own the process, implement changes, sustain improvements"},
    {"role": "Data Analyst", "responsibilities": "Collect and analyze data, build measurement systems"},
    {"role": "Subject Matter Expert", "responsibilities": "Provide domain knowledge, validate solutions"}
  ]
}`,
        messages: [
          {
            role: 'user',
            content: userContent,
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

    let charter
    try {
      // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
      charter = JSON.parse(cleaned)
    } catch {
      console.error('Failed to parse AI charter response as JSON:', text)
      return res.status(500).json({ error: 'AI returned invalid JSON. Please try again.' })
    }

    return res.status(200).json({ charter })
  } catch (err) {
    console.error('AI charter error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
