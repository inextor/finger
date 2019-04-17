import OptionsUtils from './OptionsUtils.js'


class ObjectStore
{
  constructor(name)
  {
    this.name = name;
  	this.store = null;
  }

  add( object, key )
  {
  	let request = key ? store.add( item, key ) : store.add( item );

		request.onsuccess = (evt)=>
		{
		  generatedId = evt.target.result;

			if( this.debug )
			  console.log('AddItem('+this.name+' key:'+key+' item:'+JSON.stringify( item )+' Request Success', evt );
					//resolve(evt);
    };

		request.onerror = (evt)=>
		{
		  if( this.debug )
			  console.log('AddItem('+this.name+' key:'+key+' item:'+JSON.stringify( item )+' Request Error ', evt);
		};
  }

  get( key )
	{
		return new Promise((resolve,reject)=>
		{
			if( this.debug )
			{
				console.log("Store name", this.name );
			}

			let request = this.store.get( key );

			request.onsuccess = ()=>
			{
				resolve( request.result );
			};
		});
	}

  addAll(items,insertIgnore)
  {
  	this.operation = 'w';
  	return ()=>
  	{
  	  let addedItems = []
  		items.forEach((i)=>
  		{
			  let request = this.store.add( i );
			  request.onsuccess = (generated_id)=>
			  {
			    added_items.push( generated_id );
			  };
			  request.onerror = ()=>
			  {
          if( insertIgnore )
				  {
					  evt.preventDefault();
					  evt.stopPropagation();
					  return;
				  }
				  if( this.debug )
					  console.log('AddItems '+this.name+' Request Fail ', evt );
			  };
  		}
	  }
  }

  getAll( options )
	{
		return new Promise((resolve,reject)=>
		{

			let queryObject = options && 'index' in options
		    ? this.store.index( option.index )
		    : this.store;

			let range		= OptionsUtils.getKeyRange( options );
			let count		= OptionsUtils.getCount( options );

			let request  = ( range == null && count == 0 )
				  ? queryObject.getAll()
				  : queryObject.getAll( range, count );

			request.onsuccess = ()=>
			{
				resolve( request.result );
			};

			request.onerror = ( evt )=>
			{
				let msg = 'msg' in evt ? evt['msg'] : evt;

				if( 'msg' in evt )
					reject('Some errror '+msg );
			};
		});
	}

	clear()
	{
		return new Promise((resolve,reject)=>
		{
				let request = this.store.clear();
				request.onsuccess = resolve;
				request.onerror = reject;
		});
	}

	remove( key )
	{
		return new Promise((resolve,reject)=>
		{
			let request = this.store.delete( key );
			request.onsuccess = resolve;
			request.onerror = reject;
		});
	}

  /*
	 * if options is passed resolves to the number of elements deleted
	 */
	removeAll( options )
	{
	  if( options && 'index' in options )
	  {
	    return this.removeByIndex( options );
	  }

		return new Promise((resolve,reject)=>
		{

			  let range		= OptionsUtils.getKeyRange( options );
				let request store.delete( range );
				request.onsuccess = ()=>{
				    resolve(request); //TODO Check how many deleted
				}
				request.onerror = reject;
		})
	}

	removeByIndex(index_name, options)
	{

	}

	getByKey(list, opt )
	{
		let orderedKeyList = list.slice(0);
		let options = opt ? opt : {};

		return new Promise((resolve,reject)=>
		{
			let queryObject = options && 'index' in options
		    ? this.store.index( option.index )
		    : this.store;

			let range		= OptionsUtils.getKeyRange( options );
			let items		= [];

			var i = 0;
			var cursorReq = queryObject.openCursor( range );

			cursorReq.onsuccess = (event)=>
			{
				var cursor = event.target.result;

				if (!cursor)
				{
					resolve( items ); return;
				}

				var key = cursor.key;

				while (key > orderedKeyList[i])
				{
					// The cursor has passed beyond this key. Check next.
					++i;

					if (i === orderedKeyList.length) {
						// There is no next. Stop searching.
						resolve( items );
						return;
					}
				}

				if (key === orderedKeyList[i]) {
					// The current cursor value should be included and we should continue
					// a single step in case next item has the same key or possibly our
					// next key in orderedKeyList.
					//onfound(cursor.value);
					items.push( cursor.value );
					cursor.continue();
				} else {
					// cursor.key not yet at orderedKeyList[i]. Forward cursor to the next key to hunt for.
					cursor.continue(orderedKeyList[i]);
				}
			};
		});
	}

  count(options)
	{
		return new Promise((resolve,reject)=>
		{
			let queryObject = options && 'index' in options
		    ? this.store.index( option.index )
		    : this.store;

			let range		= OptionsUtils.getKeyRange( options );
			let request = queryObject.count( range );

			request.onerror = reject;
			request.onsuccess = ()=>
			{
				resolve( request.result );
			};
		});
	}

}

