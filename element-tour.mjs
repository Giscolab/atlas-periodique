// One clock owns the visit. A delayed frame never skips several elements.
export function createElementTour({total=118,duration=3,onSelect=()=>{},onState=()=>{}}={}){
  if(!Number.isInteger(total)||total<1)throw new RangeError('Invalid element count');
  const validDuration=value=>{if(!Number.isFinite(value)||value<=0)throw new RangeError('Invalid duration');};
  validDuration(duration);
  let status='idle',current=1,elapsed=0;
  const snapshot=()=>({status,current,duration,elapsed});
  const notify=()=>onState(snapshot());
  const select=()=>{onSelect(current);notify();};
  return {
    snapshot,
    start(){
      if(status==='playing')return;
      if(status==='idle'||status==='finished'){current=1;elapsed=0;}
      status='playing';select();
    },
    pause(){if(status==='playing'){status='paused';notify();}},
    stop(){status='idle';current=1;elapsed=0;notify();},
    step(offset){
      if(!Number.isInteger(offset))throw new RangeError('Invalid step');
      current=Math.max(1,Math.min(total,current+offset));
      elapsed=0;status='paused';select();
    },
    setDuration(value){validDuration(value);duration=value;elapsed=0;notify();},
    update(delta){
      if(status!=='playing'||!Number.isFinite(delta)||delta<=0)return;
      elapsed+=delta;
      if(elapsed<duration)return;
      elapsed=0;
      if(current===total){status='finished';notify();}
      else{current++;select();}
    },
  };
}
