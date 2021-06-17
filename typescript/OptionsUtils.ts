import {ObjectStore} from "./ObjectStore";

type Comparison = '>' | '>=' | '<' | '<=' | '=';


export class Options<T>
{
	direction:IDBCursorDirection = 'next';
	count:number | null  = null;
	index:string | null = null;
	comparations:Map<Comparison,any> = new Map();

	getQueryObject(store:ObjectStore<T>):IDBObjectStore | IDBIndex
	{
		return this.index ? store.store.index( this.index ) : store.store;
	}

	getKeyRange():IDBKeyRange | null
	{
		if( this.comparations.has('=') )
		{
			return IDBKeyRange.only( this.comparations.get('=') );
		}

		let isLowerBoundOpen	= this.comparations.has('>')
		let isLowerBound  		= isLowerBoundOpen || this.comparations.has('>=');

		let isUpperBoundOpen	= this.comparations.has('<');
		let isUpperBound		= isUpperBoundOpen || this.comparations.has('<=');


		if( isLowerBound && isUpperBound )
		{
			let lowerBound	= this.comparations.get( isLowerBoundOpen ?  '>':'>=');
			let upperBound	= this.comparations.get( isUpperBoundOpen ?  '<':'<=');

			return IDBKeyRange.bound( lowerBound, upperBound, isLowerBoundOpen, isUpperBoundOpen );
		}

		if( isLowerBound )
		{
			let lowerBound	= this.comparations.get( isLowerBoundOpen ? '>' : '>=' );
			return IDBKeyRange.lowerBound( lowerBound , isLowerBoundOpen );
		}

		if( isUpperBound )
		{
			let upperBound = this.comparations.get( isUpperBoundOpen ? '<' : '<=' );
			return IDBKeyRange.upperBound( upperBound , isUpperBoundOpen );
		}

		return null;
	}
}
