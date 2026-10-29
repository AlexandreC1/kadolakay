// Original procedural geometry. No downloaded models, textures, or rendering dependency.
type V = [number, number, number];
const sub = (a: V, b: V): V => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const norm = (a: V): V => { const n=Math.hypot(...a)||1; return a.map(x=>x/n) as V; };
const cross = (a: V,b: V): V => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot = (a:V,b:V) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function multiply(a: number[],b:number[]) { const c=Array(16).fill(0); for(let col=0;col<4;col++) for(let row=0;row<4;row++) for(let k=0;k<4;k++) c[col*4+row]+=a[k*4+row]*b[col*4+k]; return c; }

function basketGeometry() {
  const data:number[]=[];
  function vertex(p:V,n:V,c:V,part=0){data.push(...p,...n,...c,part);}
  function tube(points:V[],radius:number,color:V,sides=5){
    const rings=points.map((p,i)=>{
      const tangent=norm(sub(points[Math.min(i+1,points.length-1)],points[Math.max(0,i-1)]));
      const a=norm(cross(tangent,Math.abs(tangent[1])>.9?[1,0,0]:[0,1,0]));
      const b=cross(tangent,a);
      return Array.from({length:sides},(_,j)=>{const t=j/sides*Math.PI*2;const n=a.map((v,k)=>v*Math.cos(t)+b[k]*Math.sin(t)) as V;return {p:p.map((v,k)=>v+n[k]*radius) as V,n};});
    });
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){const a=rings[i][j],b=rings[i][(j+1)%sides],c=rings[i+1][j],d=rings[i+1][(j+1)%sides];for(const v of [a,c,b,b,c,d])vertex(v.p,v.n,color);}
  }
  const circle=(y:number,r:number):V[]=>Array.from({length:113},(_,i)=>{const t=i/112*Math.PI*2;return [Math.cos(t)*r,y,Math.sin(t)*r*.68] as V;});
  // Alternating over/under depth follows the same weave pitch in both directions.
  for(let i=0;i<56;i++){
    const angle=i/56*Math.PI*2;
    const points:V[]=Array.from({length:45},(_,j)=>{const t=j/44;const r=.64+.34*t+.012*Math.cos(t*11*Math.PI*2+i*Math.PI);return [Math.cos(angle)*r,-.53+t*.78,Math.sin(angle)*r*.68];});
    tube(points,.012,[.61+(i%4)*.025,.43+(i%4)*.02,.25+(i%4)*.015]);
  }
  for(let j=0;j<23;j++){
    const t=j/22;const radius=.64+.34*t;
    const points:V[]=Array.from({length:113},(_,i)=>{const angle=i/112*Math.PI*2;const r=radius+.013*Math.cos(angle*28+j*Math.PI);return [Math.cos(angle)*r,-.53+t*.78,Math.sin(angle)*r*.68];});
    tube(points,.014,[.72+(j%3)*.02,.54+(j%3)*.02,.33+(j%3)*.015]);
  }
  for(let i=0;i<3;i++)tube(circle(.24+i*.019,.98),.021,[.75,.57,.35],8);
  tube(circle(-.53,.65),.025,[.5,.34,.18],8);
  // Raised handle sits behind the contents and the front rim through depth testing.
  for(const z of [-.11,-.06])tube(Array.from({length:65},(_,i)=>{const t=i/64*Math.PI;return [Math.cos(t)*.91,.27+Math.sin(t)*1.05,z];}),.026,[.68,.49,.28],8);
  function vessel(x:number,z:number,profile:[number,number][],color:V,part:number){
    for(let k=0;k<profile.length-1;k++){
      const [y0,r0]=profile[k],[y1,r1]=profile[k+1];
      for(let i=0;i<64;i++){
        const point=(y:number,r:number,j:number):V=>[x+Math.cos(j/64*Math.PI*2)*r,y,z+Math.sin(j/64*Math.PI*2)*r];
        const normal=(j:number):V=>norm([Math.cos(j/64*Math.PI*2),(r0-r1)/(y1-y0||.001),Math.sin(j/64*Math.PI*2)]);
        const a=point(y0,r0,i),b=point(y0,r0,i+1),c=point(y1,r1,i),d=point(y1,r1,i+1),n=normal(i),m=normal(i+1);
        vertex(a,n,color,part);vertex(c,n,color,part);vertex(b,m,color,part);vertex(b,m,color,part);vertex(c,n,color,part);vertex(d,m,color,part);
      }
    }
  }
  vessel(-.34,-.06,[[-.3,.19],[.63,.19],[.7,.17],[.72,.14],[.72,0]],[.46,.72,.76],1);
  const ceramic:[number,number][]=Array.from({length:49},(_,i)=>{const t=i/48;const y=-.3+t*1.24;const body=.075+.18*Math.exp(-Math.pow((y-.12)/.43,2));return [y,body];});
  ceramic.push([.94,.05],[.90,.05]);
  vessel(.28,.01,ceramic,[.78,.34,.23],2);
  // Woven bottom, visible through the open top.
  for(let j=-9;j<=9;j++){const x=j*.065;const half=Math.sqrt(Math.max(0,.64*.64-x*x))*.68;tube([[x,-.52,-half],[x,-.52,half]],.018,[.49,.34,.2]);}
  return new Float32Array(data);
}

export function mountBasket(canvas:HTMLCanvasElement) {
  const gl=canvas.getContext("webgl",{alpha:true,antialias:true,powerPreference:"low-power"});
  if(!gl)throw new Error("WEBGL_UNAVAILABLE");
  const resources:WebGLShader[]=[];
  function shader(type:number,source:string){const s=gl!.createShader(type)!;resources.push(s);gl!.shaderSource(s,source);gl!.compileShader(s);if(!gl!.getShaderParameter(s,gl!.COMPILE_STATUS))throw new Error("SHADER_UNAVAILABLE");return s;}
  const program=gl.createProgram()!;
  gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec3 position;attribute vec3 normal;attribute vec3 color;attribute float part;uniform mat4 mvp;uniform float reveal;varying vec3 n;varying vec3 c;varying vec3 p;void main(){p=position;if(part>.5){p.y+=reveal*.24;p.x+=(part<1.5?-.09:.09)*reveal;}n=normal;c=color;gl_Position=mvp*vec4(p,1.);}`));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 n;varying vec3 c;varying vec3 p;uniform vec3 eye;void main(){vec3 N=normalize(n);vec3 L=normalize(vec3(-3.,5.,4.));vec3 V=normalize(eye-p);float light=max(dot(N,L),0.);float spec=pow(max(dot(N,normalize(L+V)),0.),32.);float ao=.72+.28*smoothstep(-.53,.3,p.y);vec3 rgb=c*(.58+.58*light)*ao+vec3(spec*.13);gl_FragColor=vec4(rgb,1.);}`));
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error("PROGRAM_UNAVAILABLE");
  gl.useProgram(program);gl.enable(gl.DEPTH_TEST);
  const geometry=basketGeometry(),buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,geometry,gl.STATIC_DRAW);
  for(const [i,name] of ["position","normal","color"].entries()){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,40,i*12);}
  const part=gl.getAttribLocation(program,"part");gl.enableVertexAttribArray(part);gl.vertexAttribPointer(part,1,gl.FLOAT,false,40,36);
  const matrix=gl.getUniformLocation(program,"mvp"),eyeUniform=gl.getUniformLocation(program,"eye"),revealUniform=gl.getUniformLocation(program,"reveal");
  let lastAngle=.18,lastPitch=.36;
  function camera(angle:number,pitch:number){
    const eye:V=[Math.sin(angle)*4.65*Math.cos(pitch),.32+4.65*Math.sin(pitch),Math.cos(angle)*4.65*Math.cos(pitch)];
    const z=norm(sub(eye,[0,.32,0])),x=norm(cross([0,1,0],z)),y=cross(z,x);
    return {eye,x,y,z};
  }
  return {
    hitTest(clientX:number,clientY:number){
      const rect=canvas.getBoundingClientRect();
      const nx=(clientX-rect.left)/rect.width*2-1,ny=1-(clientY-rect.top)/rect.height*2;
      const {eye,x,y,z}=camera(lastAngle,lastPitch),f=Math.tan(34*Math.PI/360);
      const ray=norm(x.map((v,i)=>v*nx*f*rect.width/rect.height+y[i]*ny*f-z[i]) as V);
      let near=0,far=100;
      const min=[-1.04,-.57,-.73],max=[1.04,1.36,.73];
      for(let i=0;i<3;i++){
        if(Math.abs(ray[i])<.000001){if(eye[i]<min[i]||eye[i]>max[i])return false;continue;}
        const a=(min[i]-eye[i])/ray[i],b=(max[i]-eye[i])/ray[i];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return false;
      }
      return far>=0;
    },
    render(angle:number,pitch=.36,reveal=0){
      lastAngle=angle;lastPitch=pitch;
      const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight),dpr=Math.min(devicePixelRatio||1,1.5);
      const w=Math.round(width*dpr),h=Math.round(height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,canvas.width,canvas.height);
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const {eye,x,y,z}=camera(angle,pitch);
      const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
      const f=1/Math.tan(34*Math.PI/360),a=width/height,near=.1,far=30;
      const perspective=[f/a,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
      gl.uniformMatrix4fv(matrix,false,new Float32Array(multiply(perspective,view)));gl.uniform3fv(eyeUniform,eye);gl.uniform1f(revealUniform,reveal);gl.drawArrays(gl.TRIANGLES,0,geometry.length/10);
    },
    dispose(){gl.deleteBuffer(buffer);gl.deleteProgram(program);resources.forEach(s=>gl.deleteShader(s));}
  };
}
