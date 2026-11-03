// =============================================================================
// CALCULATIONS
// =============================================================================
// An option must be scored on at least this share of the considerations that
// carry weight before it's ranked. Totals average only the scored cells, so
// without this one lucky score could out-rank a fully scored option.
export const MIN_COVERAGE = 0.5
// Totals closer than this display identically (2 decimals), so call them a tie.
export const TIE_EPSILON = 0.005

export function scoreStats(optionId, scores, parameters, weightOverrides = null) {
  let wSum = 0, vSum = 0, active = 0, scored = 0
  for (const p of parameters) {
    const w = weightOverrides?.[p.id] ?? Number(p.weight)
    if (w <= 0) continue
    active++
    const s = scores.find(sc => sc.option_id === optionId && sc.parameter_id === p.id)
    if (!s || s.value == null) continue
    scored++
    wSum += w
    vSum += Number(s.value) * w
  }
  return { total: wSum > 0 ? vSum / wSum : null, scored, active }
}

export function weightedTotal(optionId, scores, parameters, weightOverrides = null) {
  return scoreStats(optionId, scores, parameters, weightOverrides).total
}

// Ranked options come first (by total); options with too few scores sort
// after them and are never treated as the leader.
export function rankedOptions(options, scores, parameters, weightOverrides = null) {
  return options
    .map(o => {
      const st = scoreStats(o.id, scores, parameters, weightOverrides)
      return { ...o, _total: st.total, _scored: st.scored, _active: st.active,
        _ranked: st.total != null && st.scored >= st.active * MIN_COVERAGE }
    })
    .sort((a, b) => (b._ranked - a._ranked) || ((b._total ?? -1) - (a._total ?? -1)))
}

// Leader, runner-up and the gap between them, from a rankedOptions() result.
export function standing(ranked) {
  const top = ranked[0]?._ranked ? ranked[0] : null
  const runner = top && ranked[1]?._ranked ? ranked[1] : null
  const gap = runner ? top._total - runner._total : null
  return { top, runner, gap, tied: gap != null && gap < TIE_EPSILON }
}

// small seeded PRNG (mulberry32): deterministic, so the same data always
// gives the same robustness number
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return h >>> 0
}

export function shuffled(items, rand) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function paramContribution(optionId, paramId, scores, parameters, weightOverrides = null) {
  const p = parameters.find(x => x.id === paramId)
  if (!p) return 0
  const w = weightOverrides?.[paramId] ?? Number(p.weight)
  const s = scores.find(sc => sc.option_id === optionId && sc.parameter_id === paramId)
  if (!s || s.value == null) return 0
  return Number(s.value) * w
}

export function completeness(parameters, options, scores) {
  const total = parameters.length * options.length
  if (!total) return { filled: 0, total: 0, pct: 0 }
  let filled = 0
  for (const o of options) for (const p of parameters) {
    if (scores.find(s => s.option_id === o.id && s.parameter_id === p.id && s.value != null)) filled++
  }
  return { filled, total, pct: filled / total }
}

// deterministic monte-carlo: independent ±2 jitter on each weight, count how
// often the leader holds. null when there's no clear leader to test.
export function robustness(parameters, options, scores) {
  const { top, tied } = standing(rankedOptions(options, scores, parameters))
  if (!top || tied) return null
  const rand = mulberry32(0x5167)
  let holds = 0
  const N = 100
  for (let i = 0; i < N; i++) {
    const over = {}
    for (const p of parameters) {
      over[p.id] = Math.max(0, Math.min(10, Number(p.weight) + (rand() * 4 - 2)))
    }
    if (standing(rankedOptions(options, scores, parameters, over)).top?.id === top.id) holds++
  }
  return holds / N
}

export function perWeightSensitivity(parameters, options, scores) {
  const { top, tied } = standing(rankedOptions(options, scores, parameters))
  if (!top || tied) return []
  const topId = top.id
  return parameters.map(p => {
    let flipped = 0; let flipAt = null
    for (let w = 0; w <= 10; w += 0.5) {
      const r = rankedOptions(options, scores, parameters, { [p.id]: w })
      if (standing(r).top?.id !== topId) { flipped++; if (flipAt == null) flipAt = w }
    }
    return { p, sens: flipped / 21, flipAt }
  })
}
