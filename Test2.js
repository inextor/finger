import DatabaseStore from './DatabaseStore.js';

function windowError(message, url, line) {
	   alert(message, url, line);
   }
   window.onerror=windowError;

async function testThis()
{
	let s = new DatabaseStore
	({
		name		: "users"
		,version	: 4
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
			//,foo:
			//{
			//	keyPath	: 'id'
			//	,autoIncrement: true
			//}
			,keyValue :
			{
				keyPath : null
				,autoIncrement : false
			}
		}
	});

let print_error = (error)=> console.error("Error occurred",error);
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
	s.addItem('user',{ id: 1,  name: 'Juan', age: 30, tags:['parent','beer']},null).catch( print_error )

	console.log('Added user with id specified, but no key');

	s.addItem('user',{ name: 'LowKey', age: 30, tags:['parent','beer']},null).catch(print_error)




		let items = new Array();
		items.push({ id:1 ,name:'Juan now is peter', age: 31, tags:['child','milk']});
		s.updateItems('user',items).then(uc=> console.log('Updating juan', uc ) ).catch(print_error);


		s.getDatabaseResume()
		.then((databaseResume)=>console.log('Resume', databaseResume ))
		.catch(print_error);;



	let usersArray1			=  s.getAll('user').catch(print_error);;
	let childsOnly			=  s.getAll('user',{index:'tagIndex','=':'child'}).catch(print_error);;
	let childsOnlyCount		=  s.count('user',{index:'tagIndex','=':'child'}).catch(print_error);;



	s.removeAll('user',{ index: 'age', '<' : 9 }).catch(print_error);;
	s.getAll('user').catch(print_error);;

	//console.log('Removed elements count',removedElements, 'It remains',userEqualOrGreatThan9.length, 'Elements' );



		s.addItem('keyValue',{hello:'world'},'foo1').catch(print_error);;
		s.addItem('keyValue',{bye_bye:'cruel world'},'foo2').catch(print_error);;
	s.get('keyValue','foo1').catch(print_error);;

	s.getAll('keyValue').catch(print_error);;



	s.remove('keyValue','foo1');
	s.getAll('keyValue');


s.clear('user','keyValue');
	console.log('All the stores are empty');

	s.addItems('user', users );

	 //s.deleteByKeyIds('user', responseAddAll );


s.addItems('user', users );
	console.log('Removing al id>150');
s.removeAll( 'user', { '<=': 150 });

	//console.log('Items removed ',removeAllReponse );
s.removeAll( 'user', { '>=': 150 });
//	console.log('Items removed ',removeAllReponse );
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
