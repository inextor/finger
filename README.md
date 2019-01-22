# Finger

Is a Promised indexeddb wrapper

## Examples

### Init


```javascript

import Db from './DatabaseStore.js'

let db = new Db
({
	name		: 'database_name'
	,version	: 1
	,stores		:{
		user: {
			keyPath	: 'id'
			,autoIncrement: true
			,indexes	:
			[
				{ indexName: 'name', keyPath:'name', objectParameters: { unique : false, multiEntry: false, locale: 'auto'  } }
				,{ indexName: 'age', keyPath:'age', objectParameters: { unique : false, multiEntry: false, locale: 'auto'  } }
				,{ indexName: 'tagIndex', keyPath:'tags', objectParameters: { unique : false, multiEntry: true , locale: 'auto'  } }
			]
		}
		,notes:
		{
			keyPath : null
			,autoIncrement : false
		}
	}
});


await db.init();
```

### Add records

```javascript

await db.addItems('user',[
{
	name: 'Fulanito'
	last_name: 'detal'
	tags: ['anon','anonimous','Jhon Doe', 'male']
}]);
```
### Get Single Item
```javascript
let user = await db.get('user',1);

```

### Insert and do not throw errors on duplicate items

```javascript
let ignore_on_duplicates = true;
let users = [
	{
		name : 'Jhon',
		last_name : 'Doe',
		age : 20,
		tags: ['anon','anonimous','Jhon Doe', 'male']
	},
	{
		name: Jane
		last_name: 'Doe'
		age: 19
		tags:['anon','anonimous','female']
	}
];

await db.addItems( 'user', users, ignore_on_duplicates );
```

### search, remove, count, keys, getByKey

You can use >,=,>=,<= for queries

Default keypath as index in this case id
```javascript
All users with id = 1
let users = await db.getAll('user',{ '=' : 1 });
```
using name as index

```javascript
let users = await db.getAll('user',{index: 'name' , '=' : 'Jhon' });
```

Count examples
```javascript
let total_users = await db.count('user');
let users_count = await db.count('user',{'index':'name','=': 'Jhon' });
let removed_count = await db.removeAll('user',{'index':'age','>',9 });
let all_ids = await db.getAllKeys('user',{'index':'age','>':9});
```

Using age as index

```javascript
let users_gt_19 = await db.getAll('user',{index : 'age', '>' : 19 });
```

Get a list of all users who are 18,17 or 19

```javascript
let users = await db.getByKey('user',[1,2,4,9,20],{ index:'age'})

```


### item deletion

You can use the same querires as the search

```javascript
let removed_count  = await db.removeAll('user',{ index: 'age', '<' : 9 });
```

### Remove by Ids

```javascript
let removed_count = await db.removeByKeyIds('user',[ 1,2,3,4]);

```

## Other functions
### getStoreNames
### clear
	Remove all the items in a the specified object stores

```javascript
await db.clear('user','notes',etc);
```
