# Custom Database Engine

A lightweight in-memory database engine written from scratch in TypeScript.

This project was built to explore the internal mechanics of a database, including schema validation, data storage, indexing, querying, mutation, serialization, and persistence.

## Features

* Schemas
* Runtime type validation
* Single and batch insertion
* Predicate querying
* Field projection
* Equality indexes using `Map` and `Set`
* Query limits
* Deletion through queries
* JSON serialization
* File persistence
* Import/export
* Automatic ID and index compaction during export
* Duplicate values supported by indexes

## Implementation

The database is implemented in [`src/table.ts`](src/table.ts).

The test/demo code can be found in [`src/index.ts`](src/index.ts).

The implementation intentionally keeps the public API small, primarily built around `set()` and `select()`. More complex operations can be composed from these primitives.

## Complexity

Let:

* `N` = number of rows
* `F` = number of fields
* `V` = number of fields in an input record
* `I` = number of indexes

Since indexes correspond to fields, `I <= F`.

### `set()`

General complexity:

`O(V + F + I)`

For valid records containing exactly the schema fields:

`O(F)`

Insertion does not require scanning existing rows.

### `select()`

The complexity depends on how the query is performed.

An indexed equality lookup only needs to retrieve the matching row IDs, making it significantly faster than scanning the entire table when few rows match.

Without a useful index, the database may need to examine every row, resulting in approximately:

`O(NF)`

## Design

The project intentionally prioritizes simplicity and understanding over production-level features and performance.

JSON is used for persistence to keep the serialized database simple and human-readable.

Rows use internal numeric IDs and gaps created by deletion are only compacted during export rather than immediately after every deletion.

Indexes use `Map<value, Set<id>>`, allowing multiple rows to share the same indexed value.

## Running

Install dependencies and run:

```bash
npm install
npm run start
```
