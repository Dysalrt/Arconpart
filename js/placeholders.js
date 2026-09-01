export function resolvePlaceholders(value, lex) {
  if (typeof value !== "string") return value;
  const lookup = k => lex[k.toLowerCase()]?.root ?? `%${k}%`;
  return value
    .replace(/%([A-Za-z][A-Za-z0-9_-]*?)%{([^,{}]*),([^{}]*)}/g, (_,k,a,b) => {
      const root=lookup(k); if(root===`%${k}%`) return root;
      return root + ("aeiouū".includes([...root].at(-1)?.toLowerCase()) ? a : b);
    })
    .replace(/~([A-Za-z][A-Za-z0-9_-]*)~/g, (_,k) => {
      const root=lookup(k); return root===`%${k}%`?root:root[0].toUpperCase()+root.slice(1);
    })
    .replace(/%([A-Za-z][A-Za-z0-9_-]*)%/g, (_,k) => lookup(k));
}
export function resolveLesson(obj, lex) {
  return JSON.parse(JSON.stringify(obj), (k,v)=>typeof v==="string"?resolvePlaceholders(v,lex):v);
}