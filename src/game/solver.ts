// Brute-force search over every way six numbers can be merged, to answer
// one question: does an exact hit on the target exist at all? Not every
// daily puzzle has one — that's normal for the numbers round, and it's
// exactly why the scoring gives partial credit for getting close.
//
// Mirrors engine.ts's merge rules exactly (higher minus lower, reject a
// zero-result subtraction, reject a non-exact division) so a puzzle is
// only ever reported solvable if the in-game merge controls could actually
// produce that result.
function possibleMerges(a: number, b: number): number[] {
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  const results = [a + b, a * b]
  if (hi !== lo) results.push(hi - lo)
  if (lo !== 0 && hi % lo === 0) results.push(hi / lo)
  return results
}

function search(numbers: number[], target: number, cache: Set<string>): boolean {
  if (numbers.includes(target)) return true
  if (numbers.length <= 1) return false

  const key = [...numbers].sort((x, y) => x - y).join(',')
  if (cache.has(key)) return false
  cache.add(key)

  for (let i = 0; i < numbers.length; i++) {
    for (let j = i + 1; j < numbers.length; j++) {
      const rest = numbers.filter((_, index) => index !== i && index !== j)
      for (const result of possibleMerges(numbers[i], numbers[j])) {
        if (search([...rest, result], target, cache)) return true
      }
    }
  }
  return false
}

export function isPuzzleSolvable(numbers: number[], target: number): boolean {
  return search(numbers, target, new Set())
}
