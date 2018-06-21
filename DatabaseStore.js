class DatabaseStore
{
	/*
	 	new DatabaseStore({
			name		: "users"
			,version	: 1
			,stores		:{
				user: {
					keyPath	: 'id'
					autoincrement: true
					indexes	:
					[
						{ indexName: "name", keyPath:"name", objectParameters: { uniq : false, multiEntry: false, locale: 'auto'  } }
						,{ indexName: "age", keyPath:"age", objectParameters: { uniq : false, multiEntry: false, locale: 'auto'  } }
						,{ indexName: "curp", keyPath:"age", objectParameters: { uniq : true, multiEntry: false, locale: 'auto'  } }
						,{ indexName: "tagIndex", keyPath:"age", objectParameters: { uniq : false, multiEntry: true , locale: 'auto'  } } //age i thing it must be a array
					]
				}
			}
		});
	 * */
	constructor( schema )
	{
		this.schema = schema;
		this.debug	= false;
	}

	static getDefaultSchema()
	{
		return {
			name		: 'default'
			,version	: 3
			,stores		:{
				keyValue :
				{
					keyPath : null
					,autoIncrement : false
				}
			}
		}
	}

	init()
	{
		return new Promise((resolve,reject)=>
		{
			let DBOpenRequest	   = window.indexedDB.open( this.schema.name || 'default', this.schema.version );
			DBOpenRequest.onerror   = ( evt )=>
			{
				reject( evt );
			};

			DBOpenRequest.onupgradeneeded	 = (event)=>
			{
				if( this.debug )
					console.log('Init creating stores');

				let db = event.target.result;
				this._createSchema( db );
			};

			DBOpenRequest.onsuccess = (e)=>
			{
				this.database = e.target.result;
				//this.database = DBOpenRequest.result;
				//this._createSchema( this.database );
				resolve( e );
			};
		});
	}

	_createSchema( db )
	{
		let stores 	= db.objectStoreNames;

		for(let i in this.schema.stores )
		{
			if( db.objectStoreNames.contains( i ) )
				continue;

			if( this.debug )
				console.log('creating store'+i);

			let keyPath			= 'keyPath' in this.schema.stores[i] ? this.schema.stores[i].keyPath : 'id';
			let autoincrement	= 'autoincrement' in this.schema.stores[i] ? this.schema.stores[i].autoincrement : true;
			var store	= db.createObjectStore( i ,{ keyPath: keyPath , autoIncrement: autoincrement } );

			if( ! ('indexes' in this.schema.stores[i]) )
				continue;

			this.schema.stores[i].indexes.forEach((index)=>
			{
				store.createIndex( index.indexName, index.keyPath, index.objectParameters );
			});
		}
	}


	getStoreNames()
	{
		if( this.database )
			return this.database.objectStoreNames;

		throw 'Database is not initialized';
	}

	addItem( storeName, key, item )
	{
		if( !this.database.objectStoreNames.contains( storeName ) )
			throw 'Store "'+storeName+' doesn\'t exists';

		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction( [storeName] , 'readwrite' );

			transaction.oncomplete = (evt)=>
			{
				//Never Fires
				if( this.debug )
					console.log('AddItem('+storeName+' key:'+key+' item:'+JSON.stringify( item )+' Transaction Success');
				resolve( evt );
			};

			transaction.onerror = (evt)=>
			{
				if( this.debug )
					console.log('AddItem('+storeName+' key:'+key+' item:'+JSON.stringify( item )+' Fails');

				reject( evt );
			};


			let store = transaction.objectStore( storeName );

			try
			{
				let request = store.add( item, key );

				request.onsuccess = (evt)=>
				{
					if( this.debug );
					console.log('AddItem('+storeName+' key:'+key+' item:'+JSON.stringify( item )+' Request Success');

					resolve(evt);
				};

				request.onerror = (evt)=>
				{
					reject( evt );
				};
			}
			catch(e)
			{
				if( this.debug )
					console.log( e );

				reject( e );
			}

		});
	};

	addItems(storeName, items)
	{
		if( this.debug )
			console.log('Adding items', items );

		if( !this.database.objectStoreNames.contains( storeName ) )
			return Promise.reject( 'Store "'+storeName+' doesn\'t exists');

		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction( [storeName] , 'readwrite' );

			let addedItems	= [];

			transaction.oncomplete = (evt)=>
			{
				if( this.debug )
					console.log('AddItems('+storeName+'  items:'+JSON.stringify( items )+' transaction Success');

				if( this.debug )
					console.log( evt );

				//resolve( evt );
				resolve( addedItems );
			};

			transaction.onerror = (evt)=>
			{
				reject( evt );
			};

			let store = transaction.objectStore( storeName );

			let f = (evt)=>
			{
				if( this.debug )
					console.log('AddItems Request evt', evt );
				addedItems.push( evt.target.result );
			};

			items.forEach((k)=>
			{
				let request = store.add( k );
				request.onsuccess = f;
			});

			//transaction.close(); //I dont know
		});
	}

    clear(...theArgs)
	{
		//let arr = theArgs.length == 1 && Array.isArray( theArgs ) ? theArgs[0] : theArgs;
		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction(theArgs , 'readwrite' );
			transaction.oncomplete = (evt)=>
			{
				resolve( evt );
			};

			transaction.onerror = (evt)=>
			{
				reject( evt );
			};

			theArgs.forEach((i)=>
			{
				if( this.debug )
					console.log('Deleting '+i );

				let store = transaction.objectStore( i );
				store.clear();
			});
		});
	}


    count(storeName, options)
	{
		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction([storeName], 'readonly' );

			transaction.onerror = (evt)=>
			{
				reject( evt );
			};

			let store		= transaction.objectStore( storeName );
			let queryObject = this._getQueryObject( storeName, transaction, options );
			let range		= this._getKeyRange( options );

			let request = queryObject.count( range );

			request.onsuccess = ()=>
			{
				resolve( request.result );
			};
		});
	}

    getAll(storeName, options )
	{
		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction([storeName], 'readonly' );

			transaction.onerror = (evt)=>
			{
				if( this.debug )
					console.log('GetAll( storeName: ',storeName,' Options:', JSON.stringify( options ), ' transaction error', evt);

				reject( evt );
			};


			transaction.onsuccess = (evt)=>
			{
				if( this.debug )
					console.log('GetAll( storeName: ',storeName,' Options:', JSON.stringify( options ), ' transaction success');
			};

			let store		= transaction.objectStore( storeName );

			let queryObject = this._getQueryObject( storeName, transaction, options );
			let range		= this._getKeyRange( options );
			let count		= this._getOptionsCount( options );

			let request = queryObject.getAll( range ,count );
			request.onsuccess = ()=>
			{
				resolve( request.result );
			};
			request.onerror = ( evt )=>
			{
				reject('Some errror',evt);
			};
		});
	}

    getAllKeys(storeName, options )
	{
		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction([storeName], 'readonly' );

			transaction.onerror = (evt)=>
			{
				reject( evt );
			};

			let store		= transaction.objectStore( storeName );
			let queryObject = this._getQueryObject( storeName, transaction, options );
			let range		= this._getKeyRange( options );
			let count		= this._getOptionsCount( options );

			let request = queryObject.getAllKeys( range, count );

			transaction.onsuccess = ()=>
			{
				resolve( request.result );
			};
		});
	}

	openCursor(storeName,options, callback )
	{
		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction([ storeName ], 'readwrite' );

			transaction.onerror = (evt)=>
			{
				reject( evt );
			};

			transaction.onsuccess = ( evt )=>
			{
				if( this.debug )
					console.log('opencursor( storeName: ',storeName,' Options:', JSON.stringify( options ), ' transaction success');
				//resolve( evt );
			};

			transaction.oncomplete = ( evt )=>
			{
				if( this.debug )
					console.log('OpenCursor('+storeName+' options:'+JSON.stringify( options )+' Transaction complete');
			};

			let store		= transaction.objectStore( storeName );
			let queryObject = this._getQueryObject( storeName, transaction, options );
			let range		= this._getKeyRange( options );
			let direction	= this._getOptionsDirection( options );
			let request = queryObject.openCursor( range );
			request.onsuccess = (evt)=>
			{
				if( evt.target.result )
				{
					callback( evt.target.result );
					evt.target.result.continue();
				}
				else
				{
					//Maybe call resolve
					resolve();
				}
			};
		});
	}

	put( storeName, items )
	{
		return this.update(storeName, items );
	}

	update(storeName, items )
	{
		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction([storeName], "readwrite" );

			transaction.onerror = (evt)=>
			{
				reject( evt );
			};

			let store		= transaction.objectStore( storeName );

			items.forEach((i)=>
			{
				store.put( i );
			});

			transaction.onsuccess = (evt)=>
			{
				resolve( evt );
			};
		});
	}

    get(storeName, key )
	{
		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction([storeName], 'readwrite' );

			transaction.onerror = (evt)=>
			{
				reject( evt );
			};

			let store		= transaction.objectStore( storeName );

			let request = store.get( key );

			request.onsuccess = ()=>
			{
				resolve( request.result );
			};
		});
	}

	/*
	 * if options is passed resolves to the number of elements deleted
	 */
	removeAll(storeName, options )
	{
		if( options )
		{
			let count = 0;

			return this.openCursor(storeName, options,(cursor)=>
			{
				cursor.delete();
				count++;
			})
			.then(()=>
			{
				return Promise.resolve( count );
			});
		}

		return this.clear(storeName);
	}

	remove(storeName, key )
	{
		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction([storeName], 'readwrite' );

			transaction.onerror = (evt)=>
			{
				reject( evt );
			};
			transaction.onsuccess = (evt)=>
			{

			};

			let store		= transaction.objectStore( storeName );

			let request = store.delete( key );

			request.onsuccess = ()=>
			{
				resolve( request.result );
			};
		});
	}

	_getOptionsCount( options )
	{
		if( options && 'count' in options )
			return options[ count ];

		return null;
	}

	_getOptionsDirection(options)
	{
		if( options && 'direction' in options )
			return options.direction;

		return "next"
	}
	_getQueryObject( storeName ,transaction ,options )
	{
		let store		= transaction.objectStore( storeName );
		let queryObject = store;

		if( options && 'index' in options)
		{
			queryObject = store.index( options.index );
		}

		return queryObject;
	}

	/*
	 *	x.countQuery('users','id',{index:'xxxx' '>=' : 3 , '<=' : '5' });
	 */

	_getKeyRange( options )
	{
		if( options === null || options === undefined )
			return null;

		if( '=' in options )
		{
			return IDBKeyRange.only( options['='] );
		}

		let isLowerBoundOpen	= '>' in options;
		let isLowerBound  		= isLowerBoundOpen || '>=' in options;

		let isUpperBoundOpen	= '<' in options;
		let isUpperBound		= isUpperBoundOpen || '<=' in options;


		if( isLowerBound && isUpperBound )
		{
			let lowerBound	= options[ isLowerBoundOpen ? '>=' : '>' ];
			let upperBound	= options[ isUpperBoundOpen ? '<=' : '<' ];
			return IDBKeyRange.bound( lowerBound, upperBound, isLowerBoundOpen, isUpperBoundOpen );
		}

		if( isLowerBound )
		{
			let lowerBound	= options[ isLowerBoundOpen ? '>' : '>=' ];
			return IDBKeyRange.lowerBound( lowerBound , isLowerBoundOpen );
		}

		if( isUpperBound )
		{
			let upperBound = options[ isUpperBoundOpen ? '<' : '<=' ];
			return IDBKeyRange.upperBound( upperBound , isUpperBoundOpen );
		}

		return null;
	}
}
