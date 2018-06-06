
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

s.init()
.then(()=>
{
	return s.clear('user','keyValue');
})
.then(()=>
{
	return s.addItems('user',
	[
		{ name:'Nextor', age: 35, curp:'Foooo', tags:['beer','parent'] }
		,{ name:'Sofi', age: 9, curp:'foooo2', tags:['child'] }
		,{ name:'Emma', age: 0, curp:'fooo3', tags:['baby','child'] }
	,])
})
.then(()=>
{
	return s.getAll('user');
}).then((users)=>
{
	console.log( 'All Users are ', users );
	return Promise.all
	([
		s.getAll('user',{ index: 'tagIndex', '=':'child' })
		,s.count('user',{ index: 'tagIndex', '=':'child' })
	]);
})
.then((response)=>
{
	console.log('Childs are', response[0],'Must have ', response[1], 'Elements' );


	if( response[0].length !== response[1] )
	{
		throw 'GetAll Or Count Fails';
	}

	return s.removeAll('user',{ index: 'age', '<' : 9 });
})
.then(()=>{
	return s.getAll('user');
})
.then((users)=>{
	console.log('Users were deleted, users with age >=9 years old must remain', users );

	users.forEach(u=>{
		if( u.age < 9 )
			throw 'It fails removeAll with conditions';
	});
	return s.addItem('keyValue','foo',{hello:'world'});
})
.then(()=>
{
	console.log('What happend');
	return s.get('keyValue','foo');
})
.then((result)=>
{
	console.log('Object By key is', result );
	return s.remove('keyValue','foo');
})
.then(()=>
{
	console.log('Foo was deleted');
	return s.getAll('keyValue');
})
.then((keyValueObjects)=>
{
	console.log('All the keyValue objects must be an empty array',keyValueObjects );
	if( keyValueObjects.length !== 0 )
		throw 'Remove does\'t work';

	return s.clear('user','keyValue');
})
.then(()=>
{
	console.log('IT finish all the tests');
})
.catch((z)=>
{
	console.log( z );
});
