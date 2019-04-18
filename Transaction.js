
export default class Transaction()
{
	constructor(idbstore, store_names, mode )
	{
		this.idbstore = idbstore;
		this.stores = {};
		this.store_names = store_names;
		this.mode = mode;
	}

	add(result_name,callback)
	{
		this.queue.push( callback );
		this.result_names[ callback ] = result_name;
	}
	commit()
	{
		return new Promise((resolve,reject)=>
		{
			let txt = this.idbstore.transaction( this.store_names, this.mode );
			txt.onsuccess = (evt)=>
			{
				resolve( evt );
			};

			txt.onerror = (evt)=>
			{
				reject( evt );
			};

			this.store_names.forEach((i)=>
			{
				this.stores[ i ] = new Store( txt.objectStore( i ) );
			});

			return this.runSequential( this.queue, generator ).catch((error)=>
			{
				throw error;
			});
		});
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

				return	generator( item ,index );
			});
		},Promise.resolve()).then((r)=>{
				values.push( r );
				return Promise.resolve( values );
		});
	}
}
