import{debug as c,setFailed as s}from"@actions/core";const a=o=>`../commands/${o}.ts`,e=Object.assign({});async function d(o,r){try{const{command:n}=r,t=a(n);if(!(t in e))throw new Error(`Command "${n}" not found.`);c(`Running ${n} in stage: ${o}`),e[t]().then(m=>m(o,r))}catch(n){n instanceof Error&&s(n.message)}}export{d as r};
//# sourceMappingURL=action-BvPzO5Zr.js.map
