import { supabase } from './supabase'
import { getTemplatePhasesForType } from './templates'

/**
 * Seeds tasks for a project from its assigned template.
 * Each template section becomes one task in the appropriate phase.
 * Only runs if the project currently has zero tasks.
 *
 * @param {object} project  - project row (needs .id, .type)
 * @param {string} companyId
 * @param {string} userId
 * @returns {{ count: number, error: any }}
 */
export async function seedTasksFromTemplate(project, companyId, userId) {
  const phases = getTemplatePhasesForType(project.type, companyId)
  if (!phases || phases.length === 0) {
    return { count: 0, error: 'No template found for project type: ' + project.type }
  }

  const tasks = []
  phases.forEach(phase => {
    phase.sections.forEach((section, idx) => {
      tasks.push({
        company_id: companyId,
        project_id: project.id,
        title: section,
        phase: phase.name.toLowerCase(),
        template_section: section,
        order_index: idx,
        status: 'todo',
        priority: 'medium',
        created_by: userId,
      })
    })
  })

  const { error } = await supabase.from('tasks').insert(tasks)
  return { count: error ? 0 : tasks.length, error }
}
