
let d =new DatabaseStore();//



let txt = d.getTransaction(['fooo','zzzz','yyy'],'w');
.transaction('store','fooo','numbers')
.add('stores',(txt)=>{retur x.store.getAll('>':10)})
.add('deletes',(txt)=>
{
  return x.fooo.removeAll('<5');
})
.add('remaining',(txt)=>
{
   return txt.get('stores',(stores)=>{
       stores.forEach((i)=>{ i.solved = true });
       return txt.store.stores.updateAll(stores);
   })
})
.add('finale',(txt)=>
{
  let a = [0,1,2,3,4,5,6,7,8];
  return txt.numbers.addAll( a, true );
})
.commit();



IOS2142933168

24600

18


