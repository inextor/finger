
class Transaction()
{

  this.queue = [];
  this.results = {};
  this.result_names = {}
  this.store_names;
  this.stores = {};

  constructor(idbstore, store_names, mode )
  {
    this.idbstore = idbstore;
    this.stores = store_names;
    this.store_names;
  }

  get(result_name )
  {
    return result_name in this.results ? this.results[ result_name ] : undefined;
  }

  add(result_name,callback)
  {
    this.queue.push( callback )
    this.result_names[ callback ] = result_name;
  }
  commit()
  {
     let txt = this.idbstore.transaction([this.store_names ], mode );
     this.store_names.forEach((i)=>
     {
        this.stores[ i ] = new Store( txt.objectStore( i ) );
     });

     let generator = (item)=>
     {
        let result = item(this);
        if( result instanceof Promise )
          result.then((data_result)=>{
            this.result_names[ item ] = data_result;
            return Promise.resolve();
          });

          this.result_names[ item ] = result;
          return Promise.resolve();
     };

     return this.runSequential( this.queue, generator );
  }

	runSequential( array ,generator )
	{
		if( array.length == 0 )
			return Promise.resolve([]);

		let values = [];
		return array.reduce((acum,item, index)=>{
			return acum.then((z)=>{
				if( index > 0 )
					values.push( z );

				return  generator( item ,index );
			});
		},Promise.resolve()).then((r)=>{
				values.push( r );
				return Promise.resolve( values );
		});
	}
}
