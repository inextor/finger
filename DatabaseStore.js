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
		let generatedId = null;

		if( !this.database.objectStoreNames.contains( storeName ) )
			throw 'Store "'+storeName+' doesn\'t exists';

		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction( [storeName] , 'readwrite' );

			transaction.oncomplete = (evt)=>
			{
				//Never Fires
				if( this.debug )
					console.log('AddItem('+storeName+' key:'+key+' item:'+JSON.stringify( item )+' Transaction complete');

				resolve( generatedId );
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
				let request = key ? store.add( item, key ) : store.add( item );


				request.onsuccess = (evt)=>
				{
					generatedId = evt.target.result;

					if( this.debug );
						console.log('AddItem('+storeName+' key:'+key+' item:'+JSON.stringify( item )+' Request Success', evt );
					//resolve(evt);
				};

				request.onerror = (evt)=>
				{
					if( this.debug )
						console.log('AddItem('+storeName+' key:'+key+' item:'+JSON.stringify( item )+' Request Error ', evt);
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
					console.log('AddItems('+storeName+'  items:'+JSON.stringify( items )+' transaction Complete');

				resolve( addedItems );
			};

			transaction.onerror = (evt)=>
			{
				if( this.debug )
				{
					console.log('AddItems('+storeName+'  items:'+JSON.stringify( items )+' transaction Success');
				}
				reject( evt );
			};

			let store = transaction.objectStore( storeName );

			let successEvt = (evt)=>
			{
				if( this.debug )
					console.log('AddItems '+storeName+' Request Success', evt );

				addedItems.push( evt.target.result );
			};

			let errorEvt = (evt)=>
			{
				if( this.debug )
					console.log('AddItems '+storeName+' Request Success', evt );
			};

			items.forEach((k)=>
			{
				try{
				let request = store.add( k );
				request.onsuccess = successEvt;
				request.onerror	= errorEvt;
				}catch(jj)
				{
					console.log( jj );
				}
			});
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

	put( storeName, item )
	{

	}

	putItems( storeName, items )
	{
		return this.updateItems(storeName, items );
	}

	updateItems( storeName, items )
	{
		return new Promise((resolve,reject)=>
		{
			let transaction = this.database.transaction([storeName], "readwrite" );

			transaction.onerror = (evt)=>
			{
				if( this.debug )
					console.log('PUT '+storeName+' Transactions error', evt );

				reject( evt );
			};

			transaction.onsuccess = (evt)=>
			{
				if( this.debug )
					console.log('PUT '+storeName+' Transactions success', evt );

				//resolve( results );
			};

			let results	 = [];

			transaction.oncomplete = (evt)=>
			{
				if( this.debug )
					console.log('PUT '+storeName+' Transactions complete', evt );

				resolve( results );
			};

			let store		= transaction.objectStore( storeName );


			let evtError	= (evt)=>
			{
				if( this.debug )
					console.error('PUT '+storeName+' Request error ', evt );
			};

			let evtSuccess	= (evt)=>
			{
				if( this.debug )
					console.log('PUT '+storeName+' Request Succes',evt.target.result );

				results.push( evt.target.result );
			};

			for(let i=0;i<items.length;i++)
			{
				try
				{
					let request			= store.put( items[ i ]);
					request.onerror		= evtError;
					request.onsuccess	= evtSuccess;
				}
				catch(e)
				{
					if( this.debug )
						console.log('PUT '+storeName+' Exception thrown '+JSON.stringify( i ),e );
					reject( e );
				}
			}
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
