interface Entry<K, V> {
    key: K;
    value: V;
}

export class Table<K, V> {
    private tables = new Map<K, V>();

    set(key: K, value: V) {
        this.tables.set(key, value);
    }

    get(key: K): V | undefined {
        return this.tables.get(key);
    }
	delete(key: K) {
		this.tables.delete(key);
	}
	size() : number {
		return this.tables.size;
	}
	clear() {
		this.tables.clear()
	}
	has(key: K) : boolean {
		return this.tables.has(key);
	}

    export(): Buffer {
		const entries: Entry<K, V>[] = Array.from(this.tables.entries())
		.map(([key, value]) => ({
			key,
			value
		}));

		const json = JSON.stringify(entries);

		return Buffer.from(json, "utf-8");
    }

    static import<K, V>(buffer: Buffer): Table<K, V> {
        const json = buffer.toString("utf-8");

        const entries = JSON.parse(json) as Entry<K, V>[];

		let table = new Table<K, V>();

        for (const entry of entries) {
            table.set(entry.key, entry.value);
        }

		return table
    }
}