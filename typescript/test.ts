import {DatabaseStore} from './DatabaseStore';
import {SchemaBuilder} from './SchemeBuilder';

//let db = new Db
//({
//	name		: 'database_name'
//	,version	: 1
//	,stores		:{
//		user: {
//			keyPath	: 'id'
//			,autoIncrement: true
//			,indexes	:
//			[
//				{ indexName: 'name', keyPath:'name', objectParameters: { unique : false, multiEntry: false, locale: 'auto'  } }
//				,{ indexName: 'age', keyPath:'age', objectParameters: { unique : false, multiEntry: false, locale: 'auto'  } }
//				,{ indexName: 'tagIndex', keyPath:'tags', objectParameters: { unique : false, multiEntry: true , locale: 'auto'  } }
//			]
//		}
//		,notes:
//		{
//			keyPath : null
//			,autoIncrement : false
//		}
//	}
//});
//
//
//await db.init();


async function testThis()
{
	let s:DatabaseStore = SchemaBuilder.create('users', 4, { user : "++id,name,age,curp,*tags" });

	s.debug = true;

	console.log('FUUU');
	let initResponse		= await s.init();
	console.log( 'jejeje' );

	//let z	= await s.addItem('user',null,{ id:null, name:'Pepe', age:10, curp:'92idiao2',tags:['child']});

	let users	= [{ name:'Nextor', age: 35, curp:'Foooo', tags:['beer','parent'] }
		,{ name:'Sofi', age: 9, curp:'foooo2', tags:['child'] }
		,{ name:'Emma', age: 0, curp:'fooo3', tags:['baby','child'] }
		,{ name:'Cesar', age: 0, curp:'fooo3', tags:['baby','child'] }
		,{ name:'Juan', age: 0, curp:'fooo3', tags:['baby','child'] }
		,{ name:'Maria', age: 0, curp:'fooo3', tags:['baby','child'] }
		,{ 'id': 120, name:'Pedro', age: 0, curp:'fooo3', tags:['baby','child'] }
	];


	let clearResponse		= await s.clear('user','keyValue');
	let addItemsResponse 	= await s.addItems('user', users );
	let z = await s.addItem('user',null,{ id: 1,  name: 'Juan', age: 30, tags:['parent','beer']});

	console.log('Added user with id specified, but no key', z );

	let lk = await s.addItem('user',null,{ name: 'LowKey', age: 30, tags:['parent','beer']});

	console.log('Added items ids', lk );

	try{
	let uc	= await s.updateItems('user',[{ id:1 ,name:'Juan now is peter', age: 31, tags:['child','milk']}]);
	console.log('Updating juan', uc );
	}catch(fua){ console.log( fua ); }


	try
	{
		let databaseResume = await s.getDatabaseResume();
		console.log('Resume', databaseResume );
	}
	catch(fua2)
	{
		console.log('Fua2 error' ,fua2 );
	}

	let usersArray1			= await s.getAll('user',null);
	let childsOnly			= await s.getAll('user',{index:'tagIndex','=':'child'});
	let childsOnlyCount		= await s.count('user',{index:'tagIndex','=':'child'});

	if( childsOnly.length !== childsOnlyCount )
		throw 'getAll or Count fails with options';

	let removedElements			= await s.removeAll('user',{ index: 'age', '<' : 9 });
	let userEqualOrGreatThan9	= await s.getAll('user');

	console.log('Removed elements count',removedElements, 'It remains',userEqualOrGreatThan9.length, 'Elements' );

	console.log( typeof removedElements );
	if( removedElements !== 5 )
		throw 'RemoveAll with options fails';

	let addItemResponse1		= await	s.add('keyValue','foo1',{hello:'world'});
	let addItemResponse2		= await	s.add('keyValue','foo2',{bye_bye:'cruel world'});
	let keyValueItem			= await s.get('keyValue','foo1');

	let allKeyValueItems1		= await s.getAll('keyValue',null);
	console.log('Object By key is', keyValueItem );
	console.log('All items stored in keyValue are', allKeyValueItems1 );

	let removeElementResponse	= await s.remove('keyValue','foo1');
	let allKeyValueItems2		= await s.getAll('keyValue',null);
	console.log('All items stored in keyValue after delete are ', allKeyValueItems2 );

	let responseClear			= await s.clear('user','keyValue');
	console.log('All the stores are empty');

	let responseAddAll = await s.addItems('user', users );
	console.log( responseAddAll );

	let removed = await s.deleteByKeyIds('user', responseAddAll );

	if( responseAddAll.length !== removed )
	{
		throw 'Fails on deleteByKeyIds';
	}

	let addAllTestRemoveAll = await s.addItems('user', users );
	console.log('Removing al id>150');
	let removeAllReponse = await s.removeAll( 'user', { '<=': 150 });

	console.log('Items removed ',removeAllReponse );
	removeAllReponse = await s.removeAll( 'user', { '>=': 150 });
	console.log('Items removed ',removeAllReponse );
	console.log('All finished good');

}

window.addEventListener('load',()=>
{
	try{
	testThis();
	}catch(e)
	{
		console.log( e );
	}
});
