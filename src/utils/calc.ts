// Safe calculator — shunting-yard, no Function/eval
const OPERATORS: Record<string, { prec: number; assoc: "left" | "right"; fn: (a: number, b: number) => number }> = {
  "+": { prec: 1, assoc: "left", fn: (a, b) => a + b },
  "-": { prec: 1, assoc: "left", fn: (a, b) => a - b },
  "*": { prec: 2, assoc: "left", fn: (a, b) => a * b },
  "/": { prec: 2, assoc: "left", fn: (a, b) => a / b },
  "%": { prec: 2, assoc: "left", fn: (a, b) => a % b },
  "^": { prec: 3, assoc: "right", fn: (a, b) => Math.pow(a, b) },
};

function tokenize(expr: string): string[] | null {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (!c) break;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "(" || c === ")" ) {
      tokens.push(c);
      i++;
      continue;
    }
    if (c in OPERATORS) {
      // handle unary minus
      if (c === "-" && (tokens.length === 0 || tokens[tokens.length - 1] === "(" || tokens[tokens.length - 1]! in OPERATORS)) {
        // parse number with leading -
        let num = "-";
        i++;
        while (i < expr.length && /[0-9.]/.test(expr[i]!)) {
          num += expr[i];
          i++;
        }
        if (num === "-" || num === "-.") return null;
        tokens.push(num);
        continue;
      }
      tokens.push(c);
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i]!)) {
        num += expr[i];
        i++;
      }
      // validate number
      if ((num.match(/\./g) || []).length > 1) return null;
      if (num === "." ) return null;
      tokens.push(num);
      continue;
    }
    return null;
  }
  return tokens;
}

function toRPN(tokens: string[]): string[] | null {
  const output: string[] = [];
  const stack: string[] = [];
  for (const tok of tokens) {
    if (!isNaN(Number(tok))) {
      output.push(tok);
    } else if (tok in OPERATORS) {
      while (
        stack.length > 0 &&
        stack[stack.length - 1] !== "(" &&
        stack[stack.length - 1]! in OPERATORS &&
        (
          OPERATORS[stack[stack.length - 1]!]!.assoc === "left" && OPERATORS[stack[stack.length - 1]!]!.prec >= OPERATORS[tok]!.prec ||
          OPERATORS[stack[stack.length - 1]!]!.assoc === "right" && OPERATORS[stack[stack.length - 1]!]!.prec > OPERATORS[tok]!.prec
        )
      ) {
        output.push(stack.pop()!);
      }
      stack.push(tok);
    } else if (tok === "(") {
      stack.push(tok);
    } else if (tok === ")") {
      while (stack.length > 0 && stack[stack.length - 1] !== "(") {
        output.push(stack.pop()!);
      }
      if (stack[stack.length - 1] !== "(") return null;
      stack.pop();
    } else {
      return null;
    }
  }
  while (stack.length > 0) {
    const op = stack.pop()!;
    if (op === "(" || op === ")") return null;
    output.push(op);
  }
  return output;
}

function evalRPN(rpn: string[]): number | null {
  const stack: number[] = [];
  for (const tok of rpn) {
    if (!isNaN(Number(tok))) {
      stack.push(Number(tok));
    } else if (tok in OPERATORS) {
      if (stack.length < 2) return null;
      const b = stack.pop()!;
      const a = stack.pop()!;
      if (tok === "/" && b === 0) return null;
      const res = OPERATORS[tok]!.fn(a, b);
      if (!isFinite(res)) return null;
      stack.push(res);
    } else {
      return null;
    }
  }
  return stack.length === 1 ? stack[0]! : null;
}

export function evaluateCalc(expr: string): number | null {
  const tokens = tokenize(expr);
  if (!tokens || tokens.length === 0) return null;
  const rpn = toRPN(tokens);
  if (!rpn) return null;
  return evalRPN(rpn);
}

export function isCalcQuery(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length === 0) return false;
  // Explicit = prefix forces calc mode
  if (trimmed.startsWith("=")) {
    const expr = trimmed.slice(1).trim();
    return expr.length > 0 && evaluateCalc(expr) !== null;
  }
  // Auto-detect pure math: only digits, operators, parens, spaces, dot
  if (/^[0-9+\-*/%^().\s]+$/.test(trimmed)) {
    // must contain at least one operator and at least one digit
    if (/[0-9]/.test(trimmed) && /[+\-*/%^]/.test(trimmed)) {
      return evaluateCalc(trimmed) !== null;
    }
  }
  return false;
}

export function getCalcExpression(input: string): string {
  const t = input.trim();
  if (t.startsWith("=")) return t.slice(1).trim();
  return t;
}
