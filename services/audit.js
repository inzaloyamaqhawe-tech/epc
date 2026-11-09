export function changedFields(before,after,prefix=''){
  if(JSON.stringify(before)===JSON.stringify(after))return[];
  if(before&&after&&typeof before==='object'&&typeof after==='object')return[...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(key=>changedFields(before[key],after[key],prefix?`${prefix}.${key}`:key));
  return[prefix];
}
