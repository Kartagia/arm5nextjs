import { Client, Pool } from "pg";

/**
 * @module setup/initDatabase
 * 
 * The module for initializing the database.
 * 
 * The module requires the environment for postgresql is properly set.
 */

//////////////////////////////////////////////////////////////////////////////////
//
// Database information
//
//////////////////////////////////////////////////////////////////////////////////

/**
 * The options relted to the create database.
 * @typedef {Object} CreateDatabaseOptions
 * @property {boolean} [testData=false] Does the creation add test data rows.
 */

/**
 * The options for tables.
 * 
 * @typedef {Object} TableOptions
 * @property {string[]} [tables=[]] The list of table names in the order of creation.
 */

/**
 * The options for views.
 * 
 * @typedef {Object} ViewOptions
 * @property {string[]} [views=[]] The list of views in the order of creation.
 */

/**
 * The database options.
 * @typedef {TableOptions & ViewOptions} DatabaseOptions
 */

/**
 * The default table names.
 * @type {string[]}
 */
const defaultTables = ["magicStyles", "arts", "forms", "techniques", "guidelines"];

/**
 * The default view names.
 * @type {string[]}
 */
const defaultViews = ["formsView", "techniquesView", "artsView", "guidelinesView"];

/**
 * A single magic style declaration.
 * @typedef {Object} MagicStyle
 * @property {string} name The name of the style.
 * @property {number} [style_id] The style identifier.
 */

/**
 * The list of magic styles.
 * @typedef {MagicStyle[]} MagicStyles
 */

/**
 * The type of an art.
 * @typedef {Object} Art
 * @property {string} art The art name.
 * @property {string} abbrev The art abbreviation.
 * @property {number} [art_id] The art identifier.
 * @property {string} style The art style. 
 * @property {number} [style_id] The style identifier number.
 */

/**
 * The list of arts.
 * @typedef {Art[]} Arts
 */

/**
 * The form specific properties.
 * @typedef {Object} FormProperties
 * @property {Readonly<string>} type The type of the form. Fixed to "Form".
 */

/**
 * The form data type.
 * @typedef {Art & FormProperties} Form 
 */

/**
 * The technique specific properties.
 * @typedef {Object} TechniqueProperties
 * @property {Readonly<string>} type The type of the form. Fixed to "Technique".
 */

/**
 * The technique data type.
 * @typedef {Object} Technique
 * @typedef {Art & TechniqueProperties} Technique 
 */


/**
 * The list of forms.
 * @typedef {Form[]} Forms
 */

/**
 * The list of techniques.
 * @typedef {Technique[]} Techniques
 */

/**
 * @typedef {Object} Guideline
 * @property {string} style The style name of the style.
 * @property {string} form THe form name of the guideline.
 * @property {string} technique The technique name of the guideline.
 * @property {string} name The name of the guideline.
 * @property {number} [style_id] The optional style identifier.
 * @property {number} [form_id] The optional form identifier.
 * @property {number} [technique_id] THe optional technique identifier.
 * @property {string} [description] The optional description of the guideline.
 */

/**
 * The collection of guidelines.
 * @typedef {Guideline[]} Guidelines
 */

/**
 * The default art data of the Ars Magica.
 */
const defaultData = {
    /**
     * The list of the magic styles.
     * @type {MagicStyles}
     */
    "magicStyles": [
        {name: "Hermetic"}
    ],
    /**
     * The list of arts.
     * @type {Arts}
     */
    "arts": ["Animal", "Aquam", "Auram", "Corpus", "Herbam", "Ignem", "Imaginem", "Mentem", "Terram", "Vim", 
        "Creo", "Intellego", "Muto", "Perdo", "Rego"
    ].map(
        (art, index) => ({style: "Hermetic", art_id: index, name: art, abbrev: art.substring(0,2)})
    ),
    /**
     * @type {Forms}
     */
    get forms()  {
        return this.arts.filter( (art) => (art.id < 10)).map( 
            (art) => ({style: art.style, style_id: art.style_id, art_id: art.art_id, art: art.art, type: "Form"})
        )
    },
    /**
     * @type {Techniques}
     */
    get techniques() {
        return this.arts.filter( (art) => (art.id >= 10)).map( 
            (art) => ({style: art.style, style_id: art.style_id, art_id: art.art_id, art: art.art, type: "Technique"})
        )
    },
    /**
     * @type {Guidelines}
     */
    guidelines: [
    ].map( 
        (guideline) => ({style: "Hermetic", form: guideline.form, technique: guideline.technique, level: guideline.level, name: guideline.name, description: guideline.description})
    )
}

/**
 * The test data.
 * @type {Record<string, Guidelines|Techniques|Forms|string[]>}
 */
const defaultTestData = {
    ...defaultData,
    /**
     * @type {Guidelines}
     */
    guidelines: [
        ...(defaultData.guidelines ?? {}),
        {form: 'Animal', technique: 'Creo', level: 2, name: 'Preserve a corpse from decay.', description: '[ref: Cov, page: 50]'},
        {form: 'Animal', technique: 'Creo', level: 5, name: 'Cure a Minor animal disease.', description: '[ref: DI, page: 102]'},
        {form: 'Animal', technique: 'Creo', level: 10, name: 'Cure a Serious animal disease.', description: '[ref: DI, page: 102]'},
        {form: 'Animal', technique: 'Creo', level: 15, name: 'Cure a Major animal disease.', description: '[ref: DI, page: 102]'},        {form: 'Animal', technique: 'Creo', level: 10, name: 'Cure a Serious animal disease.', description: '[ref: DI, page: 102]'},
        {form: 'Animal', technique: 'Creo', level: 20, name: 'Cure a Critical animal disease.', description: '[ref: DI, page: 102]'},        {form: 'Animal', technique: 'Creo', level: 10, name: 'Cure a Serious animal disease.', description: '[ref: DI, page: 102]'},
        {form: 'Animal', technique: 'Creo', level: 25, name: 'Stop progress of any disease.', description: '[ref: DI, page: 102]'},        {form: 'Animal', technique: 'Creo', level: 10, name: 'Cure a Serious animal disease.', description: '[ref: DI, page: 102]'},
        {form: 'Animal', technique: 'Creo', level: 25, name: 'Cure any disease countering its effects.', description: '[ref: DI, page: 102]'},        {form: 'Animal', technique: 'Creo', level: 10, name: 'Cure a Serious animal disease.', description: '[ref: DI, page: 102]'}
    ].map( 
        (guideline) => ({style: "Hermetic", form: guideline.form, technique: guideline.technique, level: guideline.level, name: guideline.name, description: guideline.description})
    )
}

//////////////////////////////////////////////////////////////////////////////////
//
// Database removal
//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Drop views.
 * @param {import("pg").PoolClient|Client} db The database client.
 * @param {ViewOptions} [options] The view options.
 * @returns {Promise<string[]>} The promise of dropped views. 
 */
export function dropViews(db, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            /**
             * The dropped table names.
             * @type {string[]}
             */
            const result = [];
            const views = (options.views ?? defaultViews);
            for (let i = views.length-1; i >= 0; i--) {
                const view = views[i];
                db.query(`DROP VIEW IF EXISTS ${view}`).then(
                    (result) => {
                        result.unshift(view)
                    }, 
                    (error) => {
                        throw new Error(`Dropping view ${view} failed`, error);
                    }
                )
            }
            resolve(result);
        } catch(error) {
            reject(`Dropping views failed`, error);
        }    
    })
}


/**
 * Drop tables.
 * @param {import("pg").PoolClient|Client} db The database client.
 * @param {TableOptions} [options] The table options.
 * @returns {Promise<string[]>} The promise of dropped tables. 
 */
export function dropTables(db, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            /**
             * The dropped table names.
             * @type {string[]}
             */
            const result = [];
            const tables = (options.tables ?? defaultTables);
            for (let i = tables.length-1; i >= 0; i--) {
                const table =tables[i];
                db.query(`DROP TABLE IF EXISTS ${table}`).then(
                    (result) => {
                        result.unshift(table)
                    }, 
                    (error) => {
                        throw new Error(`Dropping table ${table} failed`, error);
                    }
                )
            }
            resolve(result);
        } catch(error) {
            reject(`Dropping tables failed`, error);
        }    
    })
}

/**
 * @param {import("pg").PoolClient|Client} db The database client.
 * @param {DatabaseOptions} [options={}] The database options.
 * @returns {Promise<DatabaseOptions>} The promise of dropped options. 
 */
export function dropDatabase(db, options = {}) {
    return new Promise( (resolve, reject) => {
        const result = {
            views: [],
            tables: []
        };
        dropViews(db, options).then(
            (views) => {
                result.views.push(views);
                dropTables(db, options).then(
                    (tables) => {
                        result.tables.push(tables);
                    }
                )
            }
        ).then( resolve, reject);
    });
}

//////////////////////////////////////////////////////////////////////////////////
//
// Database definition
//
//////////////////////////////////////////////////////////////////////////////////

/**
 * The regular expressmatching to the valid name.
 */
const validDbNameRegex = /^[a-z_](?:{a-z0-9_*[a-z0-9])?$/i;

/**
 * The default database name options for Postgresql.
 * @type {DatabaseEntityNameCheckOptions}
 */
const defaultDbNameOptions = { 
    datalen: 32,
    message: "Invalid database entity name",
    createMessage: (/** @type {string} */ message) => {
        return new SyntaxError(message);
    }
};

/**
 * Test validity of a database entity name.
 * @param {*} name The tested name.
 * @returns {boolean} True, if and only if the name is a valid nam.e
 */
export function validDbEntityName(name, datalen=32) {
    return typeof name === "string" && name.length < datalen && validDbNameRegex.test(name);
}

/**
 * Check function is used to derive valid value.
 * - If the tested value is not suitable, an error is thrown.
 * - If the tested value is suitable, the valid value derived from it is returned.
 * @template [TYPE=any] The type of the result value.
 * @template [ERROR=Error] The type of the error of the 
 * @callback CheckFunction
 * @param {any} tested The tested value.
 * @param {CheckFnOptions<TYPE, ERROR>} [options] The options for the check.
 * @returns {TYPE} The valid result derived from the tested.
 * @throws {ERROR} The tested value was not suitable.
 */

/**
 * The check function options.
 * @template [TYPE=any] The type of the result value.
 * @template [ERROR=Error] The error type thrown on failed check.
 * @typedef {Object} CheckFnOptions
 * @property {string} [message] The error message.
 * @property {(message: string) => ERROR} createError The creator of the error.
 */

/**
 * The properties specific to teh database entity name check properties.
 * @typedef {Object} DbEntityNameCheckOptionProps
 * @property {number} [datalen] The data length of the database.
 */

/**
 * The database name check options.
 * @typedef {CheckFnOptions<SyntaxError> & DbEntityNameCheckOptionProps} DatabaseEntityNameCheckOptions
 */

/**
 * Check validity of the database entity name.
 * @param {*} name The checked name. 
 * @param {DatabaseEntityNameCheckOptions} options The database name check option.
 * @returns {string} The valid database name derived from the gien anem.
 * @throws {SyntaxError} The name is invalid.
 */
export function checkDbEntityName(name, options={}) {
    const {datalen, message, createError} = {...defaultDbNameOptions, ...options};
    if (validDbEntityName(name, datalen)) {
        return /** @type {string} */ name;
    } else {
        throw createError(message);
    }
}

/**
 * Get the promise of a valid database entity name.
 * @param {*} name The tested name.
 * @param {DatabaseEntityNameCheckOptions} [options] The database entity name check options. 
 * @returns {Promise<string>} The promise of a valid database entity name.
 * @throws {SyntaxError} The rejection value of the promise, if the name is not valid.
 */
export function promiseOfValidDbEntityName(name, options={}) {
    return new Promise( (resolve, reject) => {
        try {
            resolve(checkDbEntityName(name, options));
        } catch(error) {
            reject(error);
        }
    });
}

/**
 * The simple table definition using column and constraint definitions..
 * @typedef {Object} SimpleTableDefinition
 * @property {string} name The table name.
 * @property {ColumnDefinition[]} columns The columns of the table.
 * @property {ConstraintDefinition[]} [constraints=[]] The constraints of the table.
 * @property {() => string} toString Converts the definition to the SQL string.
 */

/**
 * The table definition creating table from query results.
 * @typedef {Object} QueryTableDefinition
 * @property {string} name The table name.
 * @property {() => string} toString Converts the definition to the SQL string.
 */

/**
 * @typedef {SimpleTableDefinition|QueryTableDefinition} TableDefinition 
 */

/**
 * The column definition.
 * @typedef {Object} ColumnDefinition
 * @property {() => string} toString The SQL string representation of the column definition.
 */

/**
 * The table constraint definition.
 * @typedef {Object} ConstraintDefinition
 * @property {() => string} toString The SQL string representation of the constraint.
 */

/**
 * The scope options.
 * @typedef {Object} ScopeOptions
 * @property {boolean} [unlogged=false] Is the element unlogged.
 * @property {boolean} [temporary=false] Is the element temporary.
 * @property {boolean} [temp=false] The alias for temporary.
 * @property {boolean} [global=false] Is the element global. Deprecated property.
 * @property {boolean} [local=false] Is the elmeent local. Deprecated property.
 */

/**
 * Get the scope options for SQL statement.
 * 
 * @param {ScopeOptions} options The scope options.
 * @returns {string} The SQL query string for the given scope options.
 * @throws {SyntaxError}The scope is invalid.
 */
function scopeOptions(options) {
    if (options.unlogged) {
        return "UNLOGGED ";
    } else if (options.temporary || options.temp) {
        return `${options.global ? "GLOBAL " : options.local ? "LOCAL " : ""}TEMPORARY `;
    } else {
        return "";
    }
}

/**
 * Get the access method declaration
 * @param {{accessMethod?: string}} options 
 * @returns {string} The SQL query string for the access method declaration.
 */
function useMethod(options) {
    if (options.accessMethod) {
        /**
         * @todo Checking for validity of the access method. 
         */
        return `USING ${options.accessMethod}`;
    } else {
        return "";
    }
}

/**
 * Get the SQL declaration of the Postgresql storage parameters.
 * @param {Record<string, string|null>>} options The table options.
 * @returns {string} The SQL string for the storage parameters.
 */
function storageParameters(options) {
    if (options.storageParams) {
        /**
         * @todo Checking for validity of the storage parameters. 
         */
        const result = Object.getOwnPropertyNames(options.storageParams).map(
            param => (options.storageParams[param] ? `${param} = ${options.storageParams[param]}` : `${param}`)
        ).join(",");
        if (result) {
            return `WITH (${result}) `;
        }
    } else {
        return "";
    }
}

/**
 * Get the commit parameter declaration.
 * @param {TableOptions} options The table options. 
 * @returns {string} The SQL string for the commit parameters.
 */
function commitParameters(options) {
    if ( (options.temporary || options.temp) && options.commit) {
        // Commit parameters are only used for temporary tables.
        /**
         * @todo Checking for validity of the commit value. 
         */
        return `ON COMMIT ${options.commit} `;
    } else {
        // The created table is not temporary.
        return "";
    }
}

/**
 * Get the table space declaration.
 * @param {TableOptions} options The options of the table. 
 * @returns {string} The SQL string for the tablespace declaration.
 * @throws {SyntaxError} The table space options were invalid.
 */
function tableSpace(options) {
    if (options.tableSpace) {
        return `TABLESPACE ${checkDbEntityName(options.tableSpace, {message: "Invalid table space name"})}`;
    } else {
        return "";
    }
}

/**
 * The inheritance options.
 * @typedef {Object} InheritanceOptions
 * @property {string[]} [parents=[]] The parent tables of the curren table.
 */

/**
 * The qualified name POJO.
 * @typedef {Object} QualifiedName
 * @property {string} name The name of the entity.
 * @property {string} [schema] The schema name of the schema qualified name.
 * @property {string} [database] The database name of the qualified name.
 */

/**
 * Parse qualified name.
 * @param {*} name The tested name.
 * @param {DbEntityNameCheckOptionProps} [options] The database constraints for the names. 
 * @returns {QualifiedName} The parsed qualifiend name.
 * @throws {SyntaxError} The qualified name is invalid.
 */
export function parseQualifiedName(name, options={}) {
    if (typeof name === "string") {
        const segments = name.split(".");
        if (segments.every( segment => (validDbEntityName(segment, options)))) {
            switch(segments.length) {
                case 3: 
                    return {database: segments[0], schema: segments[1], name: segments[2]};
                case 2:
                    return {schema: segments[0], name: segments[1]};
                case 1:
                    return {name: segments[0]};
                default:
            }
        }
    }
    // If we end up here, the name was invalid.
    throw new SyntaxError("Invalid qualified name");
}

/**
 * Test if hte given anme is a valid schema qualified name.
 * @param {*} name 
 * @param {DbEntityNameCheckOptionProps} [options] The database entity name check properties. 
 */
export function validQualifiedName(name, options={}) {
    switch (typeof name) {
        case "string":
            try {
                const qualifiedName = parseQualifiedName(name);
                return true;
            } catch(error) {
                createError(message);
            }
        case "object":
            return (name !== null && !(name instanceof Function || name instanceof Array) && 
                "name" in name && validDbEntityName(name.name, options) &&
                ["schema", "database"].every( prop => (!(prop in name) || validDbEntityName(name[prop], options))));
        default: 
            return false;
    }
}

/**
 * Test validity of a table name.
 * @param {*} name The tested name.
 * @param {DbEntityNameCheckOptionProps} [options] The options of the database names.  
 * @returns {boolean} True, if and only if the table name is valid table name.
 */
export function validTableName(name, options={}) {
    return typeof name === "string" && validQualifiedName(name, options);
}

/**
 * Get valid table name or throw an error.
 * @type {CheckFunction<string, SyntaxError>}
 */
export function checkTableName(name, options={}) {
    const {message, createError} = {...defaultDbNameOptions, ...options};
    if (validTableName(name, options)) {
        return /** @type {string} */ name;
    } else {
        throw createError(message);
    }
}

/**
 * Get the table inheritance option declaration.
 * @param {InheritanceOptions} options The inheritance options.
 * @returns {string} The SQL string for the inheritance options.
 */
function inheritOptions(options) {
    if (options.parents?.length > 0) {
        /**
         * @todo Check validity of the parent table names.
         */
        const errors = options.parents.reduce( (result, parentName, index) => {
            try {
                checkTableName(parentName); 
            } catch(error) {
                result.push({index, error, invalidValue: parentName});
            }
            return result;
        }, /** @type {{index: number, error: SyntaxError, invalidValue: any}[]} */ []);
        return `INHERITS (${options.parents.join(",")})`;
    } else {
        return "";
    }
}

/**
 * The partition options for partition by a column.
 * @typedef {Object} ColumnPartitionOptions
 * @property {string} column The column name.
 * @property {string} [operation] The operation class of the partioting. 
 */

/**
 * The partition options for partition by an expression.
 * @typedef {Object} ExpressionPartitionOptions
 * @property {string} expression The expression.
 * @property {string} [operation] The operation class of the partioting. 
 */

/**
 * The partition options.
 * @typedef {Object} PartitionOptions
 * @property {"RANGE"|”LIST"|"HASH"} type The partitioning type.
 * @property {Array<ColumnDefinition|ExpressionPartitionOptions>} by The list of partitioning
 * declarations for the partitioning.
 */

/**
 * Get teh partition option declaration.
 * @param {PartitionOptions} options The partion options.
 * @returns {string} The SQL string for the partition options.
 */
function partitionOptions(options) {
    /**
     * @todo The partition option handling.
     */
    return "";
}

/**
 * @typedef {Object} TableOptionProperties
 * @property {boolean} [ignoreExisting=false] Is the declaration ignored, if the table exists.
 */

/**
 * The table options.
 * @typedef {ScopeOptions & TableOptionProperties & InheritanceOptions & PartitionOptions} TableOptions 
 */

/**
 * Create table definition creating table from a query results.
 * @param {SelectQueryDefinition} query The select query from which the table is created.
 * @param {string} tableName The table name.
 * @param {TableOptions & {columns: string[]}} [options] The table options when creating from query.
 * @return {QueryTableDefinition} The table definition creating table from a query.
 */
export function createTableFromQuery(query, tableName, options={}) {
    if (!validTableName(tableName)) {
        throw new SyntaxError("Invalid table name");
    }
    return {
        get name() {return tableName}, 
        toString() {
            return `CREATE ${scopeOptions(options)}TABLE ${this.name} ${
             options.columns?.length > 0 ? `${options.columns.join(", ")} `: ""
            }${
             useMethod(options)
        }${
             storageParameters(options)}${options.replaceExisting ? "IF NOT EXISTS ":""
             }${
             commitParameters(options)}${tableSpace(options)} AS ${
            query.toString()
            }${options.copyData ? " WITH DATA": " WITH NO DATA"}`
        }
    }
}

/**
 * Create a table definition from columns and constraints.
 * @param {string} tableName The table name.
 * @param {ColumnDefinition[]} columns The columns of the table. 
 * @param {ConstraintDefinition[]} [constraints=[]] The table constraints of the table.
 * @param {TableOptions} [options] The table options
 * @returns {SimpleTableDefinition} The table definition created from the columns and the constraints.
 */
export function createTableDefinition(tableName, columns, constraints=[], options={}) {
    if (!validTableName(tableName)) {
        throw new SyntaxError("Invalid table name");
    }
    return {
        get name() { return tableName; },
        columns, 
        constraints,
        toString() {
            return `CREATE ${scopeOptions(options)}TABLE ${options.ignoreExisting ? "IF NOT EXISTS" :""
            } ${this.name} (${this.columns.map(column => column.toString()).join(",\n")}${
                constraints.length > 0 ? `,\n${constraints.map(constraint => constraint.toString()).join(",\n")}` : ""
            })${
                inheritOptions(options)
            }${partitionOptions(options)}${
                accessMethod(options)}${
                storageParameters(options)}${
            commitParameters(options)
            }${
            tableSpace(options)}`
        }
    };
}

/**
 * The database field definition
 * @typedef {ColumnDefinition|ConstraintDefinition} FieldDefinition
 */

/**
 * The talbe definition with field list.
 * @typedef {FieldDefinition[]} TableFieldListDefinition
 */

/**
 * @typedef {Object} StatementDefinition
 */

//////////////////////////////////////////////////////////////////////////////////
//
// Database creation
//
//////////////////////////////////////////////////////////////////////////////////



/**
 * Create database tables.
 * @param {import("pg").PoolClient} db The database connection.
 * @param {*} [options] The create tables options.
 * @returns {Promise<string[]>} The promise of the created tables in the order they were created.
 */
export function createTables(db, options = {}) {
    return new Promise( (resolve, reject) => {
        try {
            const tableDefs = (options.tableDefs ?? (defaultTableDefs ?? {}));
            (options.tables ?? defaultTables).forEach( (table, index) => {
                const def = tableDefs[table];
                db.query(`CREATE TABLE IF NOT EXISTS ${table} ${
                    typeof def === "string" ? `(${def})` : def.toString()
                    }`)
            });
        } catch(error) {
            reject(new Error(`Creation of the tables failed`, error));
        }
    })
}

/**
 * Creates the database from scrach.
 * @param {CreateDatabaseOptions} [options] The create database options.
 */
export default function createDatebase(db = defaultPool, options = {}) {
    return new Promise(async (resolve, reject) => {
        const result = {
            tables: [],
            views: [],
            triggers: []
        };
        await dropDatabase(db, options);
        result.tables.push(await createTables(db, options));
        result.views.push(await createViews(db, options));
        result.triggers.push(await createTriggers(db, options));
        if (options.testData) {
            createTestContent(db, options);
        }
    });
}