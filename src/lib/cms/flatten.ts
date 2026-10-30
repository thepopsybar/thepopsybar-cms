export type Tree = string | Tree[] | { [key: string]: Tree };

/** Flattens a content tree into dot-separated keys, e.g. "home.hero.title". */
export function flatten(node: Tree, path = ""): Record<string, string> {
  if (typeof node === "string") return { [path]: node };
  const out: Record<string, string> = {};
  const entries: [string, Tree][] = Array.isArray(node)
    ? node.map((value, index) => [String(index), value])
    : Object.entries(node);
  for (const [key, value] of entries) {
    Object.assign(out, flatten(value, path ? `${path}.${key}` : key));
  }
  return out;
}

/** Returns a copy of the tree where any string whose key has an override is replaced. */
export function applyOverrides<T>(node: T, overrides: Record<string, string>, path: string): T {
  if (typeof node === "string") {
    return (Object.prototype.hasOwnProperty.call(overrides, path) ? overrides[path] : node) as T;
  }
  if (Array.isArray(node)) {
    return node.map((item, index) => applyOverrides(item, overrides, `${path}.${index}`)) as T;
  }
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      out[key] = applyOverrides(value, overrides, path ? `${path}.${key}` : key);
    }
    return out as T;
  }
  return node;
}
