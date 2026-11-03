// =============================================================================
// TEMPLATES
// =============================================================================
// A template is a decision's considerations (and their weights) without its
// options or scores, so a new decision can start from a familiar list.
//
// Two sources, one shape:
//   - starters, defined here, available to everyone with no database rows;
//   - the user's own, saved from a decision into sigma_templates /
//     sigma_template_parameters (owner-only through RLS).
//
// Shape: { id, name, type, description, builtin, parameters: [{ name, weight,
// description, category, input_type, unit, options, has_uncertainty }] }

const p = (name, weight, description) => ({ name, weight, description })

export const STARTER_TEMPLATES = [
  {
    id: 'starter:job', name: 'Job offer', type: 'job',
    description: 'Compare offers or a move against staying put.',
    parameters: [
      p('Pay and benefits', 7, 'Salary, bonus, equity, pension, leave.'),
      p('The work itself', 8, 'Would you enjoy the day-to-day?'),
      p('Growth', 7, 'What you will learn and where it leads.'),
      p('Manager and team', 7, 'People you would work with every day.'),
      p('Stability', 5, "Company's footing and how secure the role is."),
      p('Commute and flexibility', 5, 'Travel time, remote days, hours.'),
    ],
  },
  {
    id: 'starter:home', name: 'Place to live', type: 'home',
    description: 'Flats, houses or neighbourhoods.',
    parameters: [
      p('Monthly cost', 8, 'Rent or mortgage plus bills.'),
      p('Space and layout', 6, 'Rooms, light, storage, outdoor space.'),
      p('Commute', 7, 'Door to door to work or school.'),
      p('Neighbourhood', 6, 'Safety, noise, shops, green space.'),
      p('Condition', 5, 'Repairs, heating, damp, appliances.'),
      p('Flexibility', 3, 'Lease length, notice, resale.'),
    ],
  },
  {
    id: 'starter:car', name: 'Car', type: 'car',
    description: 'New, used or none at all.',
    parameters: [
      p('Price', 8, 'Purchase or lease cost.'),
      p('Running costs', 6, 'Fuel or charging, insurance, tax, servicing.'),
      p('Reliability', 7, 'Track record and warranty.'),
      p('Safety', 6, 'Crash ratings and driver aids.'),
      p('Practicality', 5, 'Seats, boot, parking, range.'),
      p('Enjoyment', 4, 'How it feels to drive and own.'),
    ],
  },
  {
    id: 'starter:purchase', name: 'Big purchase', type: 'purchase',
    description: 'Laptops, phones, appliances, anything with a spec sheet.',
    parameters: [
      p('Price', 7, ''),
      p('Does what I need', 9, 'The jobs it has to do well.'),
      p('Quality and lifespan', 6, 'Build, reviews, how long it lasts.'),
      p('Ease of use', 5, ''),
      p('Support and warranty', 3, 'Repairs, returns, updates.'),
    ],
  },
  {
    id: 'starter:education', name: 'Course or school', type: 'education',
    description: 'Degrees, courses, bootcamps, schools.',
    parameters: [
      p('Total cost', 7, 'Fees, materials, time off work.'),
      p('What you will learn', 8, 'Syllabus and teaching quality.'),
      p('Where it leads', 8, 'Jobs, next steps, reputation.'),
      p('Time and format', 5, 'Length, schedule, online or in person.'),
      p('Location and life', 4, 'Where you would live, who you would meet.'),
    ],
  },
  {
    id: 'starter:travel', name: 'Trip', type: 'travel',
    description: 'Where to go, or which itinerary.',
    parameters: [
      p('Cost', 7, 'Flights, stay, spending.'),
      p('Things to do', 8, ''),
      p('Travel time', 5, 'Hours in transit, connections.'),
      p('Weather', 4, 'For the dates you can go.'),
      p('Ease', 4, 'Language, visas, getting around.'),
    ],
  },
].map(t => ({ ...t, builtin: true }))

// Weights live in 0–10 in 0.5 steps (DB check constraint + slider steps).
export function clampWeight(w) {
  const n = Number(w)
  if (!Number.isFinite(n)) return 5
  return Math.max(0, Math.min(10, Math.round(n * 2) / 2))
}

// Rows for sigma_parameters when a new decision starts from a template.
export function parameterRowsFromTemplate(template, decisionId) {
  return (template?.parameters || []).map((tp, i) => ({
    decision_id: decisionId,
    name: tp.name,
    weight: clampWeight(tp.weight),
    description: tp.description || null,
    category: tp.category || null,
    input_type: tp.input_type || 'text',
    unit: tp.unit || null,
    options: tp.options ?? null,
    has_uncertainty: !!tp.has_uncertainty,
    display_order: i,
  }))
}

// What gets saved when a decision is turned into a template: the
// considerations and weights, never the options or scores. Parameters with
// no name are skipped.
export function templateFromDecision(decision, parameters, name) {
  const params = [...(parameters || [])]
    .filter(pp => !pp.archived_at && String(pp.name || '').trim())
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  return {
    template: {
      name: String(name || '').trim() || String(decision?.title || '').trim() || 'Untitled template',
      type: decision?.type || 'custom',
      description: null,
    },
    parameters: params.map((pp, i) => ({
      name: pp.name.trim(),
      default_weight: clampWeight(pp.weight),
      description: pp.description || null,
      category: pp.category || null,
      input_type: pp.input_type || 'text',
      unit: pp.unit || null,
      options: pp.options ?? null,
      has_uncertainty: !!pp.has_uncertainty,
      display_order: i,
    })),
  }
}

// sigma_templates rows + sigma_template_parameters rows -> the shared shape
export function templatesFromRows(rows, paramRows) {
  return (rows || []).map(t => ({
    id: t.id,
    name: t.name,
    type: t.type,
    description: t.description,
    builtin: false,
    parameters: (paramRows || [])
      .filter(tp => tp.template_id === t.id)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map(tp => ({
        name: tp.name,
        weight: Number(tp.default_weight),
        description: tp.description,
        category: tp.category,
        input_type: tp.input_type,
        unit: tp.unit,
        options: tp.options,
        has_uncertainty: tp.has_uncertainty,
      })),
  }))
}

// "Salary · Growth · Commute +3"
export function templateSummary(template, shown = 3) {
  const names = (template?.parameters || []).map(tp => tp.name)
  if (!names.length) return 'no considerations'
  const more = names.length - shown
  return names.slice(0, shown).join(' · ') + (more > 0 ? ` +${more}` : '')
}
