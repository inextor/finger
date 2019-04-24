
import DatabaseStore from './DatabaseStore.js';
let db = new DatabaseStore
({
	name		: "raindrops"
	,version	: 2
	,stores		:{
		raindrops: {
			keyPath	: 'id'
			,autoIncrement: false
			,indexes	:
			[
				{ indexName: "position", keyPath:"position", objectParameters: { unique : false, multiEntry: false, locale: 'auto'  } }
			]
		}
	}
});

function log(txt)
{
	console.log( txt+"\n" );
}

//
// Define database
//
//db.version(1).stores({
//	raindrops: 'id,position',
//});
//log ("Using Dexie v" + Dexie.semVer);

//
// Prepare data
//
var drops = [];
for (var i=1;i<=10000;++i) {
  drops.push({
    id: i,
    position: Math.random(),
    someData: {
      someText: "some value",
      someNumber: Math.random()
    }
  });
}

//
// Test Performance
//
testPerformance().catch(err => log(err));

async function testPerformance() {
	try {
    //
    // Open Database
    //
  	await db.init();
    log(``);
    log(`bulkPut()`);
    log(`=========`);
    log(`Let's put 10,000 documents into indexedDB! ...`);
    let time = performance.now();
   let x  = await db.addItems('raindrops',drops);//db.raindrops.bulkPut(drops);
		console.log( x );

    log(`Put operations done. Took ${Math.round(performance.now() - time)} milliseconds.`);
    log(``);
    log(`Query`);
    log(`=====`);
    log(`Now query all documents within a small range...`);
    time = performance.now();
    const fewDrops = await db.getAll('raindrops',{ index: 'position','>=':0.5,'<=':0.51 });
   // 	.where('position')
   //   .between(0.5, 0.51)
   //   .toArray();
    log(`Took ${Math.round(performance.now() - time)} milliseconds to find ${fewDrops.length} matching documents`);
    log(`Now query all documents within a large range...`);
    time = performance.now();

    const manyDrops = await db.getAll('raindrops',{ index: 'position','>=':0.3,'<=':0.7 });
    //const manyDrops = await db.raindrops
    //	.where('position')
    //  .between(0.3, 0.7)
    //  .toArray();
    log(`Took ${Math.round(performance.now() - time)} milliseconds to find ${manyDrops.length} matching documents`);
    log(``);
    log(`Deleting`);
    log(`========`);
    log(`Now deleting all documents...`);
    time = performance.now();
    await db.removeAll('raindrops',{'>=':0, '<=':10000});
//			db.raindrops
//    	.where('id').between(0,10000)
//      .delete();
    log(`Delete operaton done. Took ${Math.round(performance.now() - time)} milliseconds.`);
    log(`All Done.`);
  } catch (err) {
  	switch (err && err.name) {
      case 'BulkError':
  			log ("Some documents did not succeed. However, " +
       10000-err.failures.length + " documents was added successfully");
       	break;
      case 'MissingAPIError':
      	log ("Couldn't find indexedDB API");
        break;
      case 'SecurityError':
      	document.getElementById('log').style='display:none';
        document.getElementById('safari-version').style='display:';
  			break;
      default:
      	log (err);
        break;
    }
  }
}

