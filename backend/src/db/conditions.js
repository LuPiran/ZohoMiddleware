/**
 * Aplica SET/REMOVE no documento (semântica Dynamo usada neste portal)
 * e avalia ConditionExpression nos formatos que o código realmente emite.
 */

export function applyDocumentUpdates(item, updates = {}) {
  const next = { ...(item || {}) };
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next;
}

function stripOuterParens(expr) {
  let text = expr.trim();
  while (text.startsWith("(") && text.endsWith(")")) {
    let depth = 0;
    let wrapsAll = true;
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === "(") depth += 1;
      else if (text[i] === ")") depth -= 1;
      if (depth === 0 && i < text.length - 1) {
        wrapsAll = false;
        break;
      }
    }
    if (!wrapsAll) break;
    text = text.slice(1, -1).trim();
  }
  return text;
}

function splitTopLevel(expr, operator) {
  const parts = [];
  let depth = 0;
  let last = 0;
  const needle = ` ${operator} `;
  const upper = expr;
  const search = expr.toUpperCase();
  const op = needle.toUpperCase();

  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    if (depth === 0 && search.slice(i, i + op.length) === op) {
      parts.push(upper.slice(last, i).trim());
      i += op.length - 1;
      last = i + 1;
    }
  }
  parts.push(upper.slice(last).trim());
  return parts.filter(Boolean);
}

function resolveAttrName(token, names) {
  const raw = String(token || "").trim();
  if (names[raw]) return names[raw];
  if (raw.startsWith("#") && names[raw]) return names[raw];
  return raw.replace(/^#/, "");
}

function resolveOperand(token, item, names, values) {
  const raw = String(token || "").trim();
  if (Object.prototype.hasOwnProperty.call(values, raw)) return values[raw];
  if (raw.startsWith(":") && Object.prototype.hasOwnProperty.call(values, raw)) {
    return values[raw];
  }
  const attr = resolveAttrName(raw, names);
  if (item && Object.prototype.hasOwnProperty.call(item, attr)) return item[attr];
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return item?.[attr];
}

function evalNode(expr, item, names, values) {
  const text = stripOuterParens(expr);
  const andParts = splitTopLevel(text, "AND");
  if (andParts.length > 1) {
    return andParts.every((part) => evalNode(part, item, names, values));
  }
  const orParts = splitTopLevel(text, "OR");
  if (orParts.length > 1) {
    return orParts.some((part) => evalNode(part, item, names, values));
  }

  const notExists = text.match(/^attribute_not_exists\(([^)]+)\)$/i);
  if (notExists) {
    const attr = resolveAttrName(notExists[1], names);
    return item?.[attr] === undefined || item?.[attr] === null;
  }

  const exists = text.match(/^attribute_exists\(([^)]+)\)$/i);
  if (exists) {
    const attr = resolveAttrName(exists[1], names);
    return item?.[attr] !== undefined && item?.[attr] !== null;
  }

  const cmp = text.match(/^(.+?)\s*(>=|<=|<>|=|>|<)\s*(.+)$/);
  if (cmp) {
    const left = resolveOperand(cmp[1], item, names, values);
    const right = resolveOperand(cmp[3], item, names, values);
    switch (cmp[2]) {
      case "=":
        return left === right;
      case "<>":
        return left !== right;
      case ">":
        return Number(left) > Number(right);
      case "<":
        return Number(left) < Number(right);
      case ">=":
        return Number(left) >= Number(right);
      case "<=":
        return Number(left) <= Number(right);
      default:
        break;
    }
  }

  throw new Error(`Condição MySQL não suportada: ${expr}`);
}

export function evaluateCondition(item, condition) {
  if (!condition?.expression) return true;
  return evalNode(
    condition.expression,
    item,
    condition.names || {},
    condition.values || {},
  );
}
