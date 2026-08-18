/**
 * Monta UpdateExpression com SET e REMOVE.
 * Valores null/undefined viram REMOVE (evita NULL em chaves de GSI, ex. slaDeadline).
 */
export function buildDynamoUpdateParts(updates) {
  const names = {};
  const values = {};
  const setParts = [];
  const removeNameKeys = [];

  let si = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) {
      const nk = `#rm${removeNameKeys.length}`;
      names[nk] = key;
      removeNameKeys.push(nk);
      continue;
    }
    const nk = `#s${si}`;
    const vk = `:v${si}`;
    names[nk] = key;
    values[vk] = value;
    setParts.push(`${nk} = ${vk}`);
    si += 1;
  }

  const chunks = [];
  if (setParts.length) chunks.push(`SET ${setParts.join(", ")}`);
  if (removeNameKeys.length) chunks.push(`REMOVE ${removeNameKeys.join(", ")}`);

  return {
    updateExpression: chunks.join(" "),
    names,
    values,
  };
}
