import {Options} from './OptionsUtils';

type FilterFunction = (cursor:IDBCursorWithValue)=>boolean | null;

export class ObjectStore<T>
{
	store:IDBObjectStore;
	debug:boolean = false;
	name:string;

	constructor(idbStore:IDBObjectStore)
	{
		this.store = idbStore;
		this.debug = false;
		this.name = idbStore.name;
	}

	add( item:T, key:any ):Promise<any>
	{
		return new Promise((resolve,reject)=>
		{
			let request = key !==null ? this.store.add( item, key ) : this.store.add( item );

			request.onsuccess = (evt:Event)=>
			{
				if( this.debug )
					console.log('AddItem('+this.name+' key:'+key+' item:'+JSON.stringify( item )+' Request Success', evt );

				let result = evt.target as IDBRequest;
				resolve( result.result );
			};

			request.onerror = (evt)=>
			{
				if( this.debug )
					console.log('AddItem('+this.name+' key:'+key+' item:'+JSON.stringify( item )+' Request Error ', evt);

				reject( evt );
			};
		});
	}

	//Transaction
	addAll(items:T[],insertIgnore:boolean):Promise<any>
	{
		let count = items.length;
		return new Promise((resolve,reject)=>
		{
			let added_items = [];

			let error_handler = (evt:Event)=>
			{
				if( insertIgnore )
				{
					evt.preventDefault();
					evt.stopPropagation();
					count--;
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
				request.onerror = error_handler;
				request.onsuccess = ()=>
				{
					added_items.push( request.result );
					count--;
					if( count == 0 )
						resolve( added_items );
				};
			});
		});
	}

	addAllFast( items:T[], insertIgnore:boolean )
	{
		if( !insertIgnore )
		{
			items.forEach( i => this.store.add( i ) );
			return Promise.resolve();
		}

		let error_handler = (evt:Event)=>
		{
			evt.preventDefault();
			evt.stopPropagation();
		};

		items.forEach((i)=>
		{
			let request =	this.store.add( i );
			request.onerror = error_handler;
		});

		return Promise.resolve();
	}

	clear():Promise<Event>
	{
		return new Promise((resolve,reject)=>
		{
			let request = this.store.clear();
			request.onsuccess = resolve;
			request.onerror = reject;
		});
	}

	count(options:Options<T> = new Options()):Promise<number>
	{
		return new Promise((resolve,reject)=>
		{
			let queryObject:IDBObjectStore | IDBIndex = options.getQueryObject(this);
			let range	= options.getKeyRange();
			let request = queryObject.count( range );

			request.onerror = reject;
			request.onsuccess = ()=>
			{
				resolve( request.result );
			};
		});
	}

	get<T>(key:any):Promise<T>
	{
		return new Promise((resolve,reject)=>
		{
			if( this.debug )
			{
				console.log("Store name", this.name );
			}

			let request = this.store.get( key );
			request.onerror = reject;

			request.onsuccess = ()=>
			{
				resolve( request.result );
			};
		});
	}

	getAll( options:Options<T> = new Options(),filter:FilterFunction = null ):Promise<T[]>
	{
		return new Promise((resolve,reject)=>
		{
			let queryObject:IDBObjectStore | IDBIndex = options.getQueryObject(this);
			let range	= options.getKeyRange();

			if( filter == null )
			{
				let request	= ( range == null && options.count == 0 )
						? queryObject.getAll()
						: queryObject.getAll( range, options.count);

				request.onsuccess = ()=>
				{
					resolve( request.result );
				};

				request.onerror = reject;
			}
			else
			{
				let request		= queryObject.openCursor( range, options.direction );
				let results		= [];

				request.onerror = reject;
				request.onsuccess = (evt:Event)=>
				{
					let target:any = evt.target

					if( target.result )
					{
						let cursor = target.result as IDBCursorWithValue;

						if( filter( cursor.value ) )
							results.push( cursor.value );

						cursor.continue();
					}
					else
					{
						resolve( results );
						//Maybe call resolve
					}
				};
			}
		});
	}

	getAllIndexesCounts():Promise<Map<string,number>>
	{
		return new Promise((resolve,reject)=>
		{
			let result 	= {};
			let names 	= Array.from( this.store.indexNames );

			if( names.length == 0 )
			{
				resolve(new Map());
				return;
			}

			let counter = names.length;
			if( this.debug )
				console.log('Get all index count for '+this.name );

			let map = new Map<string,number>();

			names.forEach( i =>
			{
				let index = this.store.index( i );
				let request = index.count();
				request.onerror = reject;
				request.onsuccess = ()=>
				{
					if( this.debug )
						console.log('Success Count for '+i );

					result[ i ] = request.result;
					map.set(i,request.result as number );

					counter--;
					if( counter == 0 )
						resolve( map );
				};
			});
		});
	}

	getAllKeys(options:Options<T>)
	{
		return new Promise((resolve,reject)=>
		{
			let queryObject = options && 'index' in options
				? this.store.index( options.index )
				: this.store;

			let range		= options.getKeyRange();

			let request	= ( range == null && !options.count )
					? queryObject.getAllKeys()
					: queryObject.getAllKeys( range, options.count );

			request.onsuccess = ()=>
			{
				resolve( request.result );
			};

			request.onerror = reject;
		});
	}

	getBackup()
	{
		return new Promise((resolve,reject)=>
		{
			let result 	= [];
			let request = this.store.openCursor();

			request.onerror = reject;
			request.onsuccess = (evt:Event)=>
			{
				let target:any = evt.target;
				let cursor = target.result as IDBCursorWithValue;

				if( cursor )
				{
					result.push(cursor.value );
					cursor.continue();
				}
				else
				{
					//Maybe call resolve
					resolve( result );
				}
			};
		});
	}

	remove( key:IDBValidKey ):Promise<Event>
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
	* -1 if is unknown
	*/
	removeAll( options:Options<T> = new Options()):Promise<number>
	{
		if( options.index )
		{
			return this.removeByIndex( options );
		}

		return new Promise((resolve,reject)=>
		{
			let range		= options.getKeyRange();
			let request = this.store.delete( range );
			request.onsuccess = ()=>{
				resolve(-1); //TODO Check how many deleted
			};
			request.onerror = reject;
		});
	}

	removeByIndex(options:Options<T>):Promise<number>
	{
		return new Promise((resolve,reject)=>
		{
			let index = this.store.index( options.index );
			let range = options.getKeyRange();
			let request = index.openCursor(range);
			let count = 0;

			request.onsuccess = (evt:Event)=>
			{
				let request:IDBRequest = evt.target as IDBRequest;
				let cursor:IDBCursor = request.result;

				if( cursor )
				{
					cursor.delete();
					count++;
					if( count < options.count )
					{
						cursor.continue();
					}
					else
					{
						resolve( count );
					}
				}
				else
				{
					resolve( count );
				}
			};
			request.onerror = reject;
		});
	}

	removeByKeyList(list:IDBValidKey[], options:Options<T> = new Options())
	{
		let orderedKeyList = list.slice(0);

		return new Promise((resolve)=>
		{
			let queryObject = options.getQueryObject(this);

			let count 	= 0;
			let range		= options.getKeyRange();
			let i 			= 0;
			let cursorReq = queryObject == this.store
				? this.store.openCursor( range )
				: queryObject.openKeyCursor();

			cursorReq.onsuccess = (evt:Event)=>
			{
				let target:any = evt.target;

				if( !target.result )
				{
					resolve(count);
					return;
				}

				let cursor	= target.result;
				let key		= cursor.key;

				while (key > orderedKeyList[i])
				{
					++i;
					if (i === orderedKeyList.length)
					{
						resolve( count );
						return;
					}
				}
				if (key === orderedKeyList[i])
				{
					count++;
					cursor.delete();
					cursor.continue();
				}
				else
				{
					cursor.continue(orderedKeyList[i]);
				}
			};
		});
	}

	//removeByKeyIds2(arrayOfKeyIds:IDBValidKey[]):Promise<number>
	removeByKeyIds2(arrayOfKeyIds:any[]):Promise<number>
	{
		return new Promise((resolve)=>
		{
			let total = arrayOfKeyIds.length;
			let count = 0;
			let success = ()=>{
				count++;
				total--;
				if( total == 0 )
					resolve( count );
			};

			let error = (evt:Event)=>
			{
				evt.preventDefault();
				evt.stopPropagation();
				if( total == 0 )
					resolve( count );
			};

			arrayOfKeyIds.forEach((key)=>
			{
				let request = this.store.delete( key );
				request.onsuccess = success;
				request.onerror = error;
			});
		});
	}

	getByKeyIndex(list:IDBValidKey[],options:Options<T> = new Options())
	{
		let orderedKeyList = list.slice(0);

		return new Promise((resolve,reject)=>
		{
			let queryObject = options.getQueryObject(this);
			let range		= options.getKeyRange();
			let items		= [];

			let i = 0;
			let cursorReq = queryObject == this.store
				? this.store.openCursor( range )
				: queryObject.openKeyCursor();

			cursorReq.onerror = reject;
			cursorReq.onsuccess = (evt:Event)=>
			{
				let result = evt.target as IDBRequest;
				let cursor = result.result;

				if (!cursor)
				{
					resolve( items ); return;
				}

				let key = cursor.key;

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

	//put( item:T, key:IDBValidKey ):Promise<T>
	put( item:T, key:any):Promise<T>
	{
		return new Promise((resolve,reject)=>
		{
			let request = key ? this.store.put( item, key ) : this.store.put( item );

			request.onsuccess = (evt:Event)=>
			{
				if( this.debug )
					console.log('Put Item('+this.name+' key:'+key+' item:'+JSON.stringify( item )+' Request Success', evt );

				let result = evt.target as IDBRequest;

				resolve( result.result );
			};

			request.onerror = (evt)=>
			{
				if( this.debug )
					console.log('Put Item('+this.name+' key:'+key+' item:'+JSON.stringify( item )+' Request Error ', evt);

				reject( evt );
			};
		});
	}
	/*
	updateItems(items)
	{
		return new Promise((resolve,reject)=>
		{
			let counter = items.length;
			let handler = (evt)=>{
				counter--;
				if( counter == 0 )
					resolve();
			};
			//console.log('Updating', items)
			items.forEach((i)=>{
			let request = this.store.put(i);
				request.onsuccess = handler;
				request.onerror = reject;
			});
		});
	}
	*/

	//update( item:T, key:IDBValidKey ):Promise<Event>
	update( item:T, key:any):Promise<Event>
	{
		return new Promise((resolve,reject)=>
		{
			let request = key === undefined ? this.store.put( item ) : this.store.put( item,key);
			request.onsuccess = resolve;
			request.onsuccess = reject;
		});
	}
	updateAll(items:T[]):Promise<T[]>
	{
		let promises = [];
		items.forEach(i=>
		{
			promises.push(new Promise((resolve,reject)=>
			{
				let request = this.store.put( i );
				request.onsuccess = resolve;
				request.onerror = reject;
			}));
		});
		return Promise.all( promises );
	}
}
