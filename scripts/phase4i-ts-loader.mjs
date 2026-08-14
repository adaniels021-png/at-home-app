import fs from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';

export async function resolve(specifier,context,nextResolve){
  if(specifier.startsWith('.')&&!specifier.match(/\.[cm]?[jt]sx?$/)){
    const base=fileURLToPath(new URL(specifier,context.parentURL));
    for(const extension of ['.ts','.tsx','.js','.mjs'])if(fs.existsSync(base+extension))return{url:pathToFileURL(base+extension).href,shortCircuit:true};
  }
  return nextResolve(specifier,context);
}

export async function load(url,context,nextLoad){
  if(url.endsWith('.json'))return{format:'module',source:`export default ${fs.readFileSync(fileURLToPath(url),'utf8')}`,shortCircuit:true};
  return nextLoad(url,context);
}
