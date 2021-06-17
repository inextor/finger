import {ObjectStore} from './ObjectStore';
import {Options} from './OptionsUtils';
import {SchemaBuilder, StoreDictionary} from './SchemeBuilder';
import {DatabaseSchema} from './SchemeBuilder';


type TransactionCallback = (stores:StoreDictionary)=>Promise<any>;

export class DatabaseStore
{
	debug:boolean = false;
	database:IDBDatabase;
	schema:DatabaseSchema;
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
	constructor( schema:DatabaseSchema)
	{
		this.schema = schema;
		this.debug	= false;
		this.database = null;
	}

	static builder(db_name:string,version:number, store_strings:Record<string,string>)
	{
		return new DatabaseStore( SchemaBuilder.create(db_name, version, store_strings ) );
	}

	//static getDefaultSchema()
	//{
	//	return  SchemaBuilder.create("default",1,{ keyValue: "id"})
	//}

	init()
	{
		if( this.debug )
			console.log("Init with schema ",this.schema );

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

			DBOpenRequest.onupgradeneeded	 = (evt:Event)=>
			{
				isAnUpgrade = true;

				if( this.debug )
					console.log('Init creating stores');

				let target:any = evt.target;
				let transaction:IDBTransaction = target.transaction;
				let db:IDBDatabase = target.result;
				this._createSchema( transaction, db );
			};

			DBOpenRequest.onsuccess = (e:Event)=>
			{
				let target:any = e.target;

				this.database	= target.result as IDBDatabase;
				resolve( isAnUpgrade );
			};
		});
	}

	_createSchema(transaction:IDBTransaction, db:IDBDatabase )
	{
		for(let storeName in this.schema.stores )
		{
			let store:IDBObjectStore = null;

			if( !db.objectStoreNames.contains( storeName ) )
			{
				if( this.debug )
					console.log('creating store'+storeName);

				let keyPath			= this.schema.stores[ storeName ].keyPath;
				let autoincrement	= this.schema.stores[ storeName ].autoIncrement;
				store	= db.createObjectStore( storeName ,{ keyPath: keyPath , autoIncrement: autoincrement } );

				this._createIndexForStore( store, this.schema.stores[ storeName ].indexes );
			}
			else
			{
				let store = transaction.objectStore( storeName );

				let toDelete = [];
				let indexNames:string[] = Array.from( store.indexNames );

				for( let j=0;j<indexNames.length;j++)
				{
					let i_name = store.indexNames.item( j );
					if( ! this.schema.stores[ storeName ].indexes.some( (z)=>{ return z.indexName == i_name }) )
						toDelete.push( i_name );
				}

				while( toDelete.length )
				{
					let z = toDelete.pop();
					store.deleteIndex( z );
				}

				this._createIndexForStore( store ,this.schema.stores[ storeName ].indexes );
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

	add<T,K>( storeName:string, item:T, key:K )
	{
		return this.transaction([storeName], 'readwrite',(stores)=>
		{
			return stores[ storeName ].add( item, key );
		});
	}

	addAll( storeName:string, items, insertIgnore)
	{
		return this.transaction([storeName],'readwrite',(stores,transaction)=>
		{
			return stores[storeName].addAll( items,insertIgnore );
		});
	}
	addAllFast( storeName:string, items, insertIgnore)
	{
		return this.transaction([storeName],'readwrite',(stores,transaction)=>
		{
			return stores[storeName].addAllFast( items,insertIgnore );
		});
	}

	clear(...theArgs:string[])
	{
		console.log(theArgs)
		return this.transaction(theArgs,'readwrite',(stores,transaction)=>
		{
			let promises = [];
			theArgs.forEach((i)=> promises.push( stores[i].clear() ));
			return Promise.all( promises );
		});
	}

	count( storeName:string, options:Options = new Options())
	{
		return this.transaction([storeName],'readonly',(stores,transaction)=>
		{
			return stores[ storeName ].count( options );
		},'Count '+storeName );
	}

	getAll( storeName:string, options )
	{
		return this.transaction([storeName],'readonly',(stores,transaction)=>
		{
			return stores[ storeName ].getAll( options );
		});
	}

	getAllKeys( storeName:string, options )
	{
		return this.transaction([storeName],'readwrite',(stores,transaction)=>
		{
			return stores[ storeName ].getAllKeys( options );
		},'getAllKeys '+storeName );
	}

	/*
	getByKey( storeName:string, list, opt )
	{
		return this.transaction([storeName],'readonly',(stores)=>
		{
			return stores[storeName].getByKey(list,opt );
		},'getByKey '+storeName);
	}

	customFilter<T,K>(storeName:string, options:Options<T,K>, callbackFilter: any )
	{
		return this.transaction([storeName],'readonly',(stores)=>
		{
			return stores[storeName].filter( options, callbackFilter );
		},'customFilter '+storeName);
	}
	*/

	put<T,K>( storeName:string, item:T, key:K )
	{
		return this.transaction([storeName],'readwrite',(stores)=>
		{
			return stores[ storeName ].put( item, key);
		},'put'+storeName );

	}

	/*
	putItems( storeName:string, items:any[] )
	{
		return this.updateItems(storeName, items );
	}
	*/

	update( storeName:string, item:any, key:IDBValidKey )
	{
		return this.put( storeName, item, key );
	}

	updateAll( storeName:string, items:any[])
	{
		return this.transaction([storeName],'readwrite',(stores)=>
		{
			return stores[storeName].updateAll( items );
		},'updateItems '+storeName );
	}

	get( storeName:string, key:IDBValidKey ):Promise<any>
	{
		return this.transaction([storeName],'readwrite',(stores)=>
		{
			return stores[ storeName ].get( key );
		},'get '+storeName );
	}


	/*
	 * if options is passed resolves to the number of elements deleted
	 */

	 /*
	deleteByKeyIds(storeName:string, arrayOfKeyIds:any[] ):Promise<any>
	{
		return this.transaction([storeName],'readwrite',(stores)=>
		{
			return stores[ storeName ].deleteByKeyIds( arrayOfKeyIds );
		},'deleteByKeyIds '+storeName );
	}
	*/

	/*
	 * if options is passed resolves to the number of elements deleted
	 */

	removeAll<T,K>(storeName:string, options:Options<T,K> )
	{
		return this.transaction([storeName],'readwrite',(stores)=>
		{
			return stores[ storeName ].removeAll( options );
		},'removeAll '+storeName );
	}

	remove(storeName:string, key:any )
	{
		return this.transaction([storeName], 'readwrite',(stores)=>
		{
			return stores[storeName].remove( key );
		},'remove '+storeName);
	}

	getAllIndexesCounts(storeName:string)
	{
		return this.transaction([storeName], 'readonly',(stores)=>
		{
			return stores[storeName].getAllIndexesCounts();
		},'getAllIndexesCounts '+storeName);
	}

	/*
	getDatabaseResume()
	{
		let names = Array.from( this.database.objectStoreNames );
		return this.transaction(names,'readonly',(stores,transaction)=>
		{
			let result = {};
			let promises = [];
			Object.values( stores ).forEach(( store )=>{
				let obj = { name: store.name };
				result[ store.name ]=  obj;

				promises.push
				(
					store.getAllIndexesCounts().then(( result )=>{ obj.indexes = result; return result; })
					,store.count().then((result)=>{ obj.total = result; return result; })
				);
			});

			return Promise.all( promises ).then(()=> result);
		});
	}
	*/

	close()
	{
		this.database.close();
	}

	/*
	restoreBackup( json_obj, ignoreErrors )
	{
		let names = Array.from( this.database.objectStoreNames );
		return this.transaction(names,'readwrite',(stores,transaction)=>
		{
			let promises = [];
			let keys = Object.keys( json_obj );

			keys.forEach((i)=>
			{
				if( i in stores )
					promise.push( stores.addAllFast( json_obj[ i ], ignoreErrors ).then(()=>true));
			});

			return Promise.all( promises );
		});
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

	createBackup()
	{
		let names = Array.from( this.database.objectStoreNames );
		return this.transaction(names,'readonly',(stores,transaction)=>
		{
			let result = {};
			let promises = [];
			Object.values( stores ).forEach(( store )=>{
				promises.push
				(
					store.getBackup().then(( store_result )=>{
						result[ store.name ]  = store_result;
						return true;
					})
				);
			});
			return Promise.all( promises ).then(()=>result);
		});
	}
	*/

	transaction(store_names:string[],mode:IDBTransactionMode,trans_callback:TransactionCallback,transaction_name:string):Promise<any>
	{
		store_names.forEach((i)=>{
			if( !this.database.objectStoreNames.contains( i ) )
				throw 'Store "'+i+' doesn\'t exists';
		});

		let txt:IDBTransaction = this.database.transaction( store_names, mode );

		let promise_txt = new Promise<void>((resolve,reject)=>
		{
			txt.onerror = (evt)=>
			{
				if( this.debug )
					console.log('Transaction '+(transaction_name? transaction_name: mode )+': error', evt );

				reject( evt );
			};

			txt.oncomplete = (evt)=>
			{
				if( this.debug )
					console.log('Transaction '+(transaction_name? transaction_name: mode )+': complete', evt );
				resolve();
			};
		});

		let stores = { };

		store_names.forEach((i)=>
		{
			stores[ i ] = new ObjectStore( txt.objectStore( i ) );
			stores[ i ].debug = this.debug;
		});

		let p = trans_callback( stores );

		return Promise.all([ p, promise_txt ]).then((results)=>
		{
			return Promise.resolve(results[0]);
		});
	}
}

