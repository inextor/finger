import OptionsUtils from './OptionsUtils.js';

export default class ObjectStore
{
	constructor(idbStore)
	{
		this.store = idbStore;
		this.debug = true;
	}

	add( item, key )
	{
		return new Promise((resolve,reject)=>{
			let request = key
				? this.store.add( item, key )
				: this.store.add( item );

			request.onsuccess = (evt)=>
			{
				if( this.debug )
					console.log('AddItem('+this.name+' key:'+key+' item:'+JSON.stringify( item )+' Request Success', evt );
				resolve(evt.target.result);
			};

			request.onerror = (evt)=>
			{
				if( this.debug )
					console.log('AddItem('+this.name+' key:'+key+' item:'+JSON.stringify( item )+' Request Error ', evt);
					reject( evt );
			};
		});

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

	addAllFast( items, insertIgnore )
	{
		if( !insertIgnore )
		{
			items.forEach( i => this.store.add( i ) );
			return;
		}

		let error_handler = (evt)=>
		{
			evt.preventDefault();
			evt.stopPropagation();
		};

		items.forEach((i)=>
		{
			let request =  this.store.add( i );
			request.onerror = error_handler;
		});
	}

	addAll(items,insertIgnore)
	{
		let count = items.length;
		return new Promise((resolve,reject)=>
		{
			let added_items = [];

			let success_handler = (generated_id)=>
			{
				added_items.push( generated_id );
				count--;
				if( count == 0 )
					resolve( added_items );
			};

			let error_handler = (evt)=>
			{
				if( insertIgnore )
				{
					evt.preventDefault();
					evt.stopPropagation();
					count--;
					added_items.push( null );
					if( count == 0 )
						resolve( added_items );
					return;

				}
				reject(evt);

				if( this.debug )
					console.log('AddItems '+this.name+' Request Fail ', evt );
			};

			items.forEach((i)=>
			{
				let request = this.store.add( i );
				request.onsuccess = success_handler;
				request.onerror = error_handler;
			});
		});
	}

	updateItems(items)
	{
		return new Promise((resolve,reject)=>
		{
			let counter = items.length;
			let handler = (evt)=>{
				counter--;
				if( counter == 0 )
					resolve();
			}

			/*/Weird bug doesn't recognize items as array
			for(let i=0;i<items.length;i++)
			{
				let request = this.store.put(items[i]);
				request.onsuccess = handler;
				request.onerror = reject;
			}/*/
			//console.log('Updating', items)
			items.forEach((i)=>{
			let request = this.store.put(i);
				request.onsuccess = handler;
				request.onerror = reject;
			});
			//*/
		});
	}

	getAll( options )
	{
		return new Promise((resolve,reject)=>
		{

			let queryObject = options && 'index' in options
				? this.store.index( options.index )
				: this.store;

			let range		= OptionsUtils.getKeyRange( options );
			let count		= OptionsUtils.getCount( options );

			let request	= ( range == null && count == 0 )
					? queryObject.getAll()
					: queryObject.getAll( range, count );

			request.onsuccess = ()=>
			{
				resolve( request.result );
			};

			request.onerror = reject;
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
				let request = this.store.delete( range );
				request.onsuccess = (evt)=>{
						resolve(request); //TODO Check how many deleted
				};
				request.onerror = reject;
		});
	}

	removeByIndex(options)
	{

	}

	getByKeyIndex(list,opt)
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
	getByKey(list, opt )
	{
		if( opt && 'index' in opt )
			return getByKeyIndex( list, opt )

		return new Promise((resolve,reject)=>
		{
			let result = [];
			let count = list.length;

			let success_handler = (evt)=>
			{
				count--;
				if( count == 0 )
					resolve( result );
			};
			list.forEach((i)=>
			{
				let request = this.store.get(i);
				request.onsuccess = success_handler;
				request.onerror = reject;
			})
		});
	}

	count(options)
	{
		return new Promise((resolve,reject)=>
		{
			let queryObject = options && 'index' in options
				? this.store.index( options.index )
				: this.store;

			let range		= OptionsUtils.getKeyRange( options );
			let request = queryObject.count( range );

			request.onerror = reject;
			request.onsuccess = (evt)=>
			{
				resolve( request.result );
			};
		});
	}

	customFilter( options, callbackFilter )
	{
		return new Promise((resolve,reject)=>
		{
			let queryObject = options && 'index' in options
				? this.store.index( option.index )
				: this.store;

			let range		= OptionsUtils.getKeyRange( options );
			let direction	= OptionsUtils.getDirection( options );
			let request		= queryObject.openCursor( range, direction );

			let results		= [];

			request.onsuccess = (evt)=>
			{
				if( evt.target.result )
				{
					if( callbackFilter( evt.target.result.value ) )
						results.push( evt.target.result.value );

					evt.target.result.continue();
				}
				else
				{
					//Maybe call resolve
					resolve( results );
				}
			};
		});
	}

	deleteByKeyIds(storeName, arrayOfKeyIds )
	{
		let total = 0 ;

		return this.count( storeName,{})
		.then((count)=>
		{
			total = count;
			return new Promise((resolve,reject)=>
			{
				let transaction = this.database.transaction([storeName], 'readwrite' );
				let store = transaction.objectStore( storeName );

				transaction.oncomplete = (evt)=>
				{
					resolve( evt );
				};

				transaction.onerror = (evt)=>
				{
					reject( evt );
				};

				arrayOfKeyIds.forEach((key)=>
				{
					let request = store.delete( key );
				});
			});
		})
		.then(()=>
		{
			return this.count( storeName, {} );
		})
		.then((count)=>
		{
			return Promise.resolve( total - count );
		});
	}
	getAllIndexesCounts()
	{
		return new Promise((resolve,reject)=>
		{
			let result 	= {};
			let names 	= Array.from( this.store.indexNames );
			let counter = names.length;
			if( this.debug )
				console.log('Get all index count for '+this.store.name );
			names.forEach( i =>
			{
				let index = this.store.index( i );
				let request = index.count();
				request.onerror = reject;
				request.onsuccess = (evt)=>
				{
					if( this.debug )
						console.log('Success Count for '+i );
					result[ i ] = request.result;
					counter--;
					if( counter == 0 )
						resolve( result );
				};
			});
		});
	}
}
