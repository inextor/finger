
let s = new DatabaseStore
({
	name		: "users"
	,version	: 1
	,stores		:{
		user: {
			keyPath	: 'id'
			,autoIncrement: true
			,indexes	:
			[
				{ indexName: "name", keyPath:"name", objectParameters: { unique : false, multiEntry: false, locale: 'auto'  } }
				,{ indexName: "age", keyPath:"age", objectParameters: { unique : false, multiEntry: false, locale: 'auto'  } }
				,{ indexName: "curp", keyPath:"curp", objectParameters: { unique : false, multiEntry: false, locale: 'auto'  } }
				,{ indexName: "tagIndex", keyPath:"tags", objectParameters: { unique : false, multiEntry: true , locale: 'auto'  } } //age i thing it must be a array
			]
		}
		,keyValue :
		{
			keyPath : null
			,autoIncrement : false
		}
	}
});
s.debug = true;


async function testThis()
{
	console.log('FUUU');
	let initResponse		= await s.init();
	console.log( 'jejeje' );

	//let z	= await s.addItem('user',null,{ id:null, name:'Pepe', age:10, curp:'92idiao2',tags:['child']});

	//console.log( z );

	let clearResponse		= await s.clear('user','keyValue');
	let addItemsResponse 	= await s.addItems('user',
	[
		{ name:'Nextor', age: 35, curp:'Foooo', tags:['beer','parent'] }
		,{ name:'Sofi', age: 9, curp:'foooo2', tags:['child'] }
		,{ name:'Emma', age: 0, curp:'fooo3', tags:['baby','child'] }
	]);

	console.log('Added items ids', addItemsResponse );

	let usersArray1			= await s.getAll('user');
	let childsOnly			= await s.getAll('user',{index:'tagIndex','=':'child'});
	let childsOnlyCount		= await s.count('user',{index:'tagIndex','=':'child'});

	if( childsOnly.length !== childsOnlyCount )
		throw 'getAll or Count fails with options';

	let removedElements			= await s.removeAll('user',{ index: 'age', '<' : 9 });
	let userEqualOrGreatThan9	= await s.getAll('user');

	console.log('Removed elements count',removedElements, 'It remains',userEqualOrGreatThan9.length, 'Elements' );

	if( removedElements !== 1 )
		throw 'RemoveAll with options fails';

	let addItemResponse1		= await	s.addItem('keyValue','foo1',{hello:'world'});
	let addItemResponse2		= await	s.addItem('keyValue','foo2',{bye_bye:'cruel world'});
	let keyValueItem			= await s.get('keyValue','foo1');

	let allKeyValueItems1		= await s.getAll('keyValue');
	console.log('Object By key is', keyValueItem );
	console.log('All items stored in keyValue are', allKeyValueItems1 );

	let removeElementResponse	= await s.remove('keyValue','foo1');
	let allKeyValueItems2		= await s.getAll('keyValue');
	console.log('All items stored in keyValue after delete are ', allKeyValueItems2 );

	let responseClear			= await s.clear('user','keyValue');
	console.log('All the stores are empty');

}


try{
testThis();
}catch(e)
{
	console.log( e );
}
