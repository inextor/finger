import ObjectStore from './ObjectStore.js';


function promiseAll( object )
{
	var promises	= [];
	var index		= [];

	for( var i in object )
	{
		index.push( i );
		promises.push( object[ i ] );
	}

	return Promise.all( promises ).then
	(
		(values)=>
		{
			var obj = {};
			values.forEach((value,i)=>obj[ index[ i ] ] = value );
			return Promise.resolve( obj );
		}
	);
}

export default class DatabaseStore
{
	/*
	/*
	    name : "users"
	    ,version : 1
	    stores:
	    {
	      user : { keyPath: 'id'
	      ,autoincrement: true
	      ,indexes:
	      {
	        'name' : {keypath: 'name', objectParameters: { uniq: false, multientry
	      }
	    }

	 	new DatabaseStore(""{
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
		this.database = null;
	}

	static getDefaultSchema()
	{
		return {
			name		: 'default'
			,version	: 1
			,stores		:{
				keyValue :
				{
					keyPath : null
					,autoIncrement : false
				}
			}
		};
	}

	init()
	{
		return new Promise((resolve,reject)=>
		{
			let DBOpenRequest	   = window.indexedDB.open( this.schema.name || 'default', this.schema.version );

			let isAnUpgrade = false;
			DBOpenRequest.onerror   = ( evt )=>
			{
				if( this.debug )
					console.log( evt );

				reject( evt );
			};

			DBOpenRequest.onupgradeneeded	 = (evt)=>
			{
				isAnUpgrade = true;

				if( this.debug )
					console.log('Init creating stores');

				let db = evt.target.result;
				this._createSchema( evt.target.transaction, db );
			};

			DBOpenRequest.onsuccess = (e)=>
			{
				this.database	= e.target.result;
				resolve( isAnUpgrade );
			};
		});
	}

	_createSchema( transaction, db )
	{
		let stores 	= db.objectStoreNames;

		for(let storeName in this.schema.stores )
		{
			let store = null;

			if( ! ('indexes' in this.schema.stores[ storeName ]) )
			{
				this.schema.stores[ storeName ].indexes = [];
			}

			if( !db.objectStoreNames.contains( storeName ) )
			{
				if( this.debug )
					console.log('creating store'+storeName);

				let keyPath			= 'keyPath' in this.schema.stores[ storeName ] ? this.schema.stores[ storeName ].keyPath : 'id';
				let autoincrement	= 'autoincrement' in this.schema.stores[storeName] ? this.schema.stores[storeName].autoincrement : true;
				store	= db.createObjectStore( storeName ,{ keyPath: keyPath , autoIncrement: autoincrement } );

				this._createIndexForStore
				(
					store
					,this.schema.stores[ storeName ].indexes
				);
			}
			else
			{
				let store = transaction.objectStore( storeName );

				let toDelete = [];

				for( let j=0;j<store.indexNames.length;j++)
				{
					if( ! this.schema.stores[ storeName ].indexes.some( z=> z.indexName == store.indexNames.item( j )) )
						toDelete.push( store.indexNames.item( j ) );
				}

				while( toDelete.length )
				{
					let z = toDelete.pop();
					store.deleteIndex( z );
				}

				this._createIndexForStore
				(
					store
					,this.schema.stores[ storeName ].indexes
				);
			}
		}

		let dbStoreNames = Array.from( db.objectStoreNames );

		dbStoreNames.forEach((storeName)=>
		{
			if( !(storeName in this.schema.stores) )
			{
				db.deleteObjectStore( storeName );
			}
		});
	}

	_createIndexForStore( store, indexesArray )
	{
		indexesArray.forEach((index)=>
		{
			if( !store.indexNames.contains( index.indexName ) )
				store.createIndex( index.indexName, index.keyPath, index.objectParameters );
		});
	}


	getStoreNames()
	{
		if( this.database )
			return this.database.objectStoreNames;

		throw 'Database is not initialized';
	}

	addItem( storeName, item, key )
	{
		return this.transaction([storeName], 'readwrite',( stores,transaction )=>
		{
			return stores[ storeName ].add( item, key );
		});
	}

	addItems(storeName, items, insertIgnore)
	{
		return this.transaction([storeName],'readwrite',(stores,transaction)=>
		{
			return stores[storeName].addAllFast( items, insertIgnore );
		});
	}

	clear(...theArgs)
	{
		return this.transaction(theArgs,'readwrite',(stores,transaction)=>
		{
			let promises = [];
			theArgs.forEach((i)=> promises.push( stores[i].clear() ));
			return Promise.all( promises );
		});
	}

	count(storeName, options)
	{
		return this.transaction([storeName],'readonly',(stores,transaction)=>
		{
			return stores[ storeName ].count( options );
		});
	}

	getAll(storeName, options )
	{
		return this.transaction([storeName],'readonly',(stores,transaction)=>
		{
			return stores[ storeName ].getAll( options );
		});
	}

	getAllKeys(storeName, options )
	{
		return this.transaction([storeName],'readwrite',(stores,transaction)=>
		{
			return stores[ storeName ].getAllKeys( options );
		});
	}

	getByKey(storeName, list, opt )
	{
		return this.transaction([storeName],'readonly',(stores,transaction)=>
		{
			return stores[storeName].getByKey(list,opt );
		});
	}

	customFilter(storeName, options, callbackFilter )
	{
		return this.transaction([storeName],'readonly',(stores,transaction)=>
		{
			return stores[storeName].customFilter( options );
		});
	}

	put( storeName, item )
	{
		return this.putItems(storeName, [item ] );
	}

	putItems( storeName, items )
	{
		return this.updateItems(storeName, items );
	}

	updateItems( storeName, items_array )
	{
		return this.transaction([storeName],'readwrite',(stores,transaction)=>
		{
			return stores[ storeName ].updateItems( items_array );
		});
	}

	get(storeName, key )
	{
		return this.transaction([storeName],'readwrite',(stores,transaction)=>
		{
			return stores[ storeName ].get( key );
		});
	}


	/*
	 * if options is passed resolves to the number of elements deleted
	 */

	deleteByKeyIds(storeName, arrayOfKeyIds )
	{
		return this.transaction([storeName],'readwrite',(stores,transaction)=>
		{
			return stores[ storeName ].deleteByKeyIds( arrayOfKeyIds );
		});
	}

	/*
	 * if options is passed resolves to the number of elements deleted
	 */

	removeAll(storeName, options )
	{
		return this.transaction([storeName],'readwrite',(stores,transaction)=>
		{
			return stores[ storeName ].removeAll( options );
		});
	}

	remove(storeName, key )
	{
		return this.transaction([storeName], 'readwrite',(stores,transaction)=>
		{
			return stores[storeName].remove( key );
		});
	}

	getAllIndexesCounts( storeName )
	{
		return this.transaction([storeName], 'readonly',(stores,transaction)=>
		{
			return stores[storeName].getAllIndexesCounts( storeName );
		});
	}

	getDatabaseResume()
	{
		let indexCounts	= {};
		let storeCounts = {};

		let names = Array.from( this.database.objectStoreNames );

		names.forEach((name)=>
		{
			indexCounts[ name ] = this.getAllIndexesCounts( name );
			storeCounts[ name ] = this.count(name,{});
		});

		return promiseAll
		({
			 storeCounts: promiseAll( storeCounts )
			,indexCounts: promiseAll( indexCounts )
		})
		.then(( allCounts )=>
		{
			let result = [];
			for(let i in allCounts.storeCounts )
			{
				let item =
				{
					name: i
					,total: allCounts.storeCounts[ i ]
					,indexes: []
				};

				for(let j in allCounts.indexCounts[ i ] )
				{
					item.indexes.push
					({
						name : j
						,count : allCounts.indexCounts[ i ][ j ]
					});
				}

				result.push( item );
			}
			return Promise.resolve( result );
		});
	}

	close()
	{
		this.database.close();
	}

	restoreBackup( json_obj, ignoreErrors )
	{
		let promises = [];
		let keys = Object.keys( json_obj );

		keys.forEach((key)=>
		{
			promises.push( this.addItems( key ,json_obj[ key ], ignoreErrors ) );
		});

		return Promise.all( promises );
	}

	__serialize(obj)
	{
		if( obj instanceof Blob )
		{
			return new Promise((resolve,reject)=>
			{
				var reader = new FileReader();
 				reader.readAsDataURL(blob);
 				reader.onloadend = function() {
 				    resolve({ type: "blob" , data: reader.result });
 				};
			});
		}

		return Promise.resolve( obj );
	}

	__getBackupFromStore( storeName )
	{
		return new Promise((resolve,reject)=>
		{
			let result = [];
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
			let request = store.openCursor();

			request.onsuccess = (evt)=>
			{
				if( evt.target.result )
				{
					result.push(  evt.target.result.value );
					evt.target.result.continue();
				}
				else
				{
					//Maybe call resolve
					resolve( result );
				}
			};
		});
	}

	createBackup()
	{
		let names = Array.from( this.database.objectStoreNames );

		let results = {
		};

		names.forEach((storeName,index)=>{
			results[ storeName ] = this.__getBackupFromStore( storeName );
		});

		return promiseAll( results );
	}

	transaction(store_names,mode,callback)
	{
		return new Promise((resolve,reject)=>
		{
			store_names.forEach((i)=>{
				if( !this.database.objectStoreNames.contains( i ) )
					throw 'Store "'+i+' doesn\'t exists';
			});

			let txt = this.database.transaction( store_names, mode );

			txt.onerror = (evt)=>
			{
				if( this.debug )
					console.log('Transaction '+mode+': error', evt );

				reject( evt );
			};

			txt.oncomplete = (evt)=>
			{
				if( this.debug )
					console.log('Transaction '+mode+': complete', evt );
				//resolve( results );
			};

			let stores = { };

			store_names.forEach((i)=>
			{
				stores[ i ] = new ObjectStore( txt.objectStore( i ) );
			});

			let result = callback( stores,txt );

			if( result instanceof Promise )
				result.then( resolve ).catch( reject );
			else
				resolve( result );
		});
	}
}
