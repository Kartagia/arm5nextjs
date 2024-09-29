
/**
 * The SQL helper module to help creating SQL commands. 
 * 
 * @module utils/sql/helper
 */

///////////////////////////////////////////////////////////////////////
// Utility types
///////////////////////////////////////////////////////////////////////

/**
 * Parse a value.
 * @template [SOURCE=string] The parsed value type.
 * @template RESULT The result type of the successful parse.
 * @template [EXCEPTION=SyntaxError] The exception thrown on failed parse.
 * @callback Parser
 * @param {SOURCE} source The parsed value.
 * @returns {RESULT} The parsed value.
 * @throws {EXCEPTION} The source could not be parsed.
 */

///////////////////////////////////////////////////////////////////////
// Data Types
///////////////////////////////////////////////////////////////////////

/**
 * Abstract data type for data for properties shared by all data types.
 * 
 * @template [TYPE=any] The Javascript type of the value handled by the datatype.
 * @template [SQL_TYPE=string] The SQL type used to send and receive the type from SQL.
 * @typedef {Object} AbstractDataType
 * @property {string} name The data type name.
 * @property {TYPE} [defaultValue] The default value.
 * @property {Parser<TYPE, SQL_TYPE>} format Convert the type value to SQL value.
 * @property {Parser<SQL_TYPE, TYPE>} parse Parse the type value from SQL value.
 * @abstract
 */

/**
 * The properties specific to the simple data type.
 * @template [TYPE=any] The Javascript type of the value handled by the datatype.
 * @template [SQL_TYPE=string] The SQL type used to send and receive the type from SQL.
 * @typedef {Object} SimpleDataTypeProps
 * @property {string} sqlType The SQL type name. 
 */

/**
 * A simple data type using some SQL data type as its representation.
 * @template [TYPE=any] The Javascript type of the value handled by the datatype.
 * @template [SQL_TYPE=string] The SQL type used to send and receive the type from SQL.
 * @typedef {AbstractDataType<TYPE, SQL_TYPE> & SimpleDataTypeProps<TYPE, SQL_TYPE>} SimpleDataType
 */

/**
 * The properties specific to the complex data type.
 * @template [TYPE=any] The Javascript type of the value handled by the datatype.
 * @template [SQL_TYPE=string] The SQL type used to send and receive the type from SQL.
 * @typedef {Object} ComplexDataTypeProps
 * @property {string} declaration The SQL declaration of the complex type.
 */


/**
 * @template [TYPE=any] The Javascript type of the value handled by the datatype.
 * @template [SQL_TYPE=string] The SQL type used to send and receive the type from SQL.
 * @typedef {AbstractDataType<TYPE, SQL_TYPE> & ComplexDataTypeProps<TYPE, SQL_TYPE>} ComplexDataType
 */

/**
 * Data type definition.
 * @template [TYPE=any] The Javascript type of the value handled by the datatype.
 * @template [SQL_TYPE=string] The SQL type used to send and receive the type from SQL.
 * @typedef {SimpleDataType<TYPE, SQL_TYPE>|ComplexDataType<TYPE, SQL_TYPE>} DataType
 */

/**
 * The list of SQL type names by categories.
 * @type {Readonly<Record<string, string[]>>}
 */
export const sqlTypeNames =  {
    INTEGER: ["BIT", "TINYINT", "SMALLINT", "INT", "BIGINT"],
    FLOAT: ["DECIMAL", "FLOAT", "REAL", "NUMERIC"],
    DATE: ["DATETIME", "TIMESTAMP", "YEAR"],
    STRING: ["CHAR", "VARCHAR", "VARCHAR(max)", "TEXT", "CLOB"],
    UNICODE: ["NCHAR", "NVARCHAR", "NVARCHAR(max)", "NTEXT"],
    BINARY: ["BINARY", "VARBINARY", "VARBINARY(max)", "IMAGE", "BLOB"], 
    MISC: ["JSON", "XML"]
}

///////////////////////////////////////////////////////////////////////
// Table Column Definitions
///////////////////////////////////////////////////////////////////////

/**
 * The column creation options.
 * 
 * @template TYPE The Javascript type of the column.
 * @template SQL_TYPE The SQL type of the column.
 * @typedef {Object} CreateColumnOptions
 * @property {boolean} [autoIncrement=false] Does the column have autoincrement default value.
 * @property {boolean} [primaryKey=false] Is the column sole primary key of the table.
 * @property {boolean} [unique=false] Is the column value unique.
 * @property {TYPE} [default] The default value of the column.
 * @property {boolean} [nullable=false] Does the column allow null value.
 */

/**
 * The column creation options for a primary key column.
 * @template TYPE The Javascript type of the column.
 * @template SQL_TYPE The SQL type of the column.
 * @typedef {Omit<CreateColumnOptions<TYPE, SQL_TYPE>, "primaryKey"|"nullable"> & 
 * {primaryKey: true, nullable: false}} PrimaryKeyColumnOptions
 */

/**
 * The column creation options for an autoincrementing primary key column.
 * @template TYPE The Javascript type of the column.
 * @template SQL_TYPE The SQL type of the column.
 * @typedef {Omit<CreateColumnOptions<TYPE, SQL_TYPE>, "default"|"autoIncrement"|"primaryKey"|"nullable"> & 
 * {autoIncrement: true, primaryKey: true, nullable: false}} AutoincrementPrimaryKeyColumnOptions
 */


/**
 * The column creation options for an unique column.
 * @template TYPE The Javascript type of the column.
 * @template SQL_TYPE The SQL type of the column.
 * @typedef {Omit<CreateColumnOptions<TYPE, SQL_TYPE>, "unique"> & {unique: true}} UniqueColumnOptions
 */

///////////////////////////////////////////////////////////////////////
// Table definitions
///////////////////////////////////////////////////////////////////////

/**
 * Table creation options.
 * @typedef {Object} CreateTableOptions
 * @property {boolean} [ignoreExisting=false] Does the create table ignore existing
 * table. If true, the table creation is ignored if the table already exists.
 */

/**
 * Table removal options.
 * @typedef {Object} RemoveTableOptions
 * @property {boolean} [ignoreMissing=false] Does the drop ignore missing table. If true,
 * a missing table does not cause an error.
 */

///////////////////////////////////////////////////////////////////////
// View definitions
///////////////////////////////////////////////////////////////////////

/**
 * The options of view creation.
 * @typedef {Object} CreateViewOptions
 * @property {boolean} [ignoreExisting=false] Does the create view ignore existing
 * view. If true, the view creation is ignored if the view already exists.
 */

/**
 * The options of the view removal.
 * @typedef {Object} RemoveViewOptions
 * @property {boolean} [ignoreMissing=false] Does the drop ignore missing view. If true,
 * a missing view does not cause an error.
 */


///////////////////////////////////////////////////////////////////////
// DBMS Definitions
///////////////////////////////////////////////////////////////////////

/**
 * @template TYPES The types Javascript supported by the database.
 * @template SQL_TYPES The sql types supported by the database.
 * @typedef {Object} DBMS
 * @property {string} name The name of the DBMS
 * @property {SimpleDataType<TYPES, SQL_TYPES>} supportedSqlTypes The SQL types suppoted by the DBMS.
 * @property {(columName: string, type: DataType<TYPES, SQL_TYPES>, options: CreateColumnOptions<TYPES, SQL_TYPES>) => string} createColumn Get the 
 * create column SQL command.
 * @property {(type: ComplexDataType<TYPES, SQL_TYPES>) => string} [createType] Get the SQL command to create a
 * new custom type.
 * @property {(tableName: string, options: CreateTableOptions) => string} createTable Get the SQL command to create
 * a table.
 * @property {(tableName: string, options: RemoveTableOptions) => string} removeTable Get the SQL commadn to remove
 * a table.
 * @property {(viewName: string, options: CreateViewOptions) => string} createView Get the SQL command to create a view.
 * @property {(viewName: string, options: RemoveViewOptions) => string} removeView Get the SQL command to drop
 * a view.
 */