"use server"
/**
 * @model actions/guidelines
 * 
 * The actions to get and alter the guidelines.
 */

import { revalidatePath } from "next/cache";
import { compareIgnoreUndefined } from "./comparison.mjs";
import { GuidelineModel, NotFoundException, guidelineKeyToString, getGuidelineKey } from "./guidelines.mjs";
import { compareLevel, compareName, artComparison, compareGuideline, compareGuidelineKeys } from "./guidelines.mjs";
import {Pool, Client} from 'pg';
const pool = new Pool();

/**
 * Initializes the database.
 */
function initDatabase() {
}

/**
 * The guideline key type.
 * @typedef {import("@/data/guidelines.mjs").GuidelineKey} GuidelineKey
 */

/**
 * The filter selecting some guidelines.
 * 
 * @typedef {Predicate<Partial<GuidelineKey>>} GuidelineFilter
 */

/**
 * The guidelines.
 * @type {Array<GuidelineModel>}
 */
var guidelines = [
    new GuidelineModel("Create an animal", "Creo", "Animal", 20, "Create a mundane animal."),
    new GuidelineModel("Destroy a specific kind of magical effect", "Perdo", "Vim", null,
        "Destroy a specific kind (such a Hermetic spell of specific Form) of level (level + 2 magnitudes)/2.")
];

/**
 * Binary search the index of a value from an array.
 * @template TYPE
 * @param {Array<TYPE>} collection The collection with search window ordered with the comparator.
 * @param {TYPE} seeked The seeked value. 
 * @param {number} [start=0] The start of the search window. Defaults to the start of the
 * collection.
 * @param {number} [end] The end index of the search window. Defaults to the length of the
 * collection.
 * @param {(a:TYPE, b:TYPE) => (number|undefined)} [comparator] The comparator comparing the values of the collection.
 * @returns {number} The index of an seeked value, or -1 - insertion index of the seeked value.
 * @throws {TypeError} Any of the collection values was not comparable with the seeked using
 * the comparator. 
 * @throws {RangeError} The start or end index was invalid.
 */
function binarySearch(collection, seeked, start = 0, end = undefined, comparator = (a, b) => (
    a === b ? 0 : a < b ? -1 : b < a ? 1 : undefined
)) {
    var s = start;
    if (s < 0 || s > collection.length) {
        throw new RangeError("Invalid start index of the search window.")
    }
    var e = end ?? collection.length;
    if (e < 0 || e > collection.lenght) {
        throw new RangeError("Invalid end index of the search window.")
    }
    var i = Math.floor((start + end) / 2);
    var cmp = 0;
    while (s < e && cmp === 0) {
        cmp = comparator(seeked, collection[i]);
        if (cmp === undefined) {
            throw new TypeError("Incompatible seeked value", new RangeError(
                `The value at index ${i} was not comparable with seeked.`
            ))
        } else if (cmp < 0) {
            e = i;
        } else if (cmp > 0) {
            s = i + 1;
        }
    }
    // Checking if the value was found.
    return cmp === 0 ? i : -1 - s;
}

/**
 * The query builder data type.
 * @typedef {Object} QueryBuilder
 * @property {string[]} [whereClauses=[]] The where clauses.
 * @property {any[]} queryValues The list of query values.
 * @property {number} [placeholderCount=0] The number of unique placeholders.
 * @property {Record<string, number>} [fieldPlaceholders={}] The placeholders of fields.
 * @property {string[]} [groupClauses=[]] The group clauses of the query.
 * @property {string[]} [havingClauses=[]] The having cluases of the query. 
 * @property {string[]} [orderClauses=[]] The order clauses of the query.
 */

function validFieldName(fieldName) {
    return /^([a-z](?:\w*[a-z0-9])?)(?:\.([a-z](?:\w*[a-z0-9])?)?)$/.test(field);
}

/**
 * Get guidelines.
 * @param {GuidelineFilter} [filter] The filter selecting some of the guidelines.
 * Defaults to a filter accepting all guidelines.
 * @returns {Promise<import("./guidelines.mjs").Guideline[]>} 
 */
export async function getGuidelines(filter = (() => (true)), sqlFilter = undefined) {
    return new Promise( (resolve, reject) => {
        /** @type {QueryBuilder} */
        var queryBuilder = (getOwnPropertyNames(sqlFilter ?? {})).reduce(
            ( /** @type {QueryBuilder} */ result, /** @type {string} */ fieldName, index) => {
                if (validFieldName(fieldName)) {
                    if (sqlFilter[fieldName] === null) {
                        result.whereClauses.push(`${field} IS NULL`);
                    } else if (result.fieldPlaceholders && fieldName in result.fieldPlaceholders) {
                        // Using the placeholder value of the field.
                        result.whereClauses.push(`${fieldName} = \$${result.fieldPlaceholders[fieldName]}`);
                    } else {
                        // The field is not stored into the placeholders.
                        result.placeholderCount++;
                        result.whereClauses.push(`${fieldName} = \$${result[2]}`);
                        result.queryValues.push(sqlFilter[fieldName]);
                        result.fieldPlaceholders = {
                            ...(result.fieldPlaceholders ?? {}),
                            [fieldName]: result.placeholderCount
                        };
                    }
                } else {
                    // Invalid fields are ignored.
                    console.log(`Ignoring filter field ${field}`);
                }
                return result;
            }
            , /** @type {QueryBuilder} */ { 
                /** @type {string[]} */
                whereClauses:  [], 
                /** @type {any[]} */
                queryValues: [], 
                /** @type {number} */
                placeholderCount: 0}
        );
        queryBuilder = Object.getOwnPropertyNames(order ?? {}).reduce(
            (result, fieldName, index) => {
                if (validFieldName(fieldName)) {
                    const orderValue = order[fieldName];
                    if (orderValue === null) {
                        // The field is ignored for order
                    } else {
                        // The field is not stored into the placeholders.
                        result.orderClauses = [...(result.orderClauses ?? []), `${fieldName} ${orderValue}`];
                    }
                } else {
                    // Invalid fields are ignored.
                    console.log(`Ignoring filter field ${field}`);
                }
                return result;
            },
            queryBuilder
        )

        const stmt = pool.query("SELECT form,technique,level,name,description "+
            "FROM guidelinesView "+
            "WHERE style='Hermetic' " +
            (queryBuilder.whereClauses?.length > 0 ? `AND ${queryBuilder.whereClauses.join(" AND ")}` : "") +
            "ORDER BY style, form, technique, level, name" + 
            (queryBuilder.orderClauses?.length > 0 ? `, ${queryBuilder.orderClauses.join(", ")}` : ""),
            queryBuilder.queryValues);
        try {
            stmt.then(
                (result) => {
                    resolve(result.rows.map( row => (
                        /** @type {import("@/data/guidelines.mjs").Guideline} */ {
                        technique: /** @type {string} */ row.technique,
                        form: /** @type {string} */ row.form,
                        name: /** @type {string} */ row.name, 
                        description: /** @type {string|undefined} */ row.description == null ? undefined: row.desciption,
                        level: /** @type {number|null} */ row.level === 0 ? null : /** @type {number} */ row.level
                    })));
                },
                (error) => {
                    reject(new Error("Could not access the guidelines data", error));
                }
            );
        } catch(error) {
            reject(new Error("Cound not access the guidelines data", error));
        }
    });
}

/**
 * Add guieline to the guidelines.
 * 
 * @param {GuidelineModel} guideline The added guideline.
 * @returns {Promise<GuidelineKey>} The guideline key of the created guideline.
 * @throws {RangeError} The guideline was invalid.
 */
export async function addGuideline(guideline) {
    return new Promise( (resolve, reject) => {
        console.group(`Adding new guideline ${guidelineKeyToString(guideline)}`);
        try {
            pool.query(
                'INSERT INTO spell_guidelines(style_id, form_id, technique_id, level, name, description) '+ 
                'SELECT style_id, form_id, art_id as technique_id, $3, $4, $5 ' +
                "FROM ( select style_id, art_id as form_id FROM formView where style = 'Hermetic' AND art = $1) AS form "+ 
                "NATURAL JOIN ( select style_id, art_id as technique_id from techniqueView where style = 'Hermetic' and art = $2) AS technique",
                [
                    guideline.form,
                    guideline.technique, 
                    guideline.level == null ? 0 : guideline.level, 
                    guideline.name, guideline.description == null ? null : guideline.description
                ]).then(
                        (result) => {
                            if (result.rowCount > 0) {
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        },
                        (error) => {
                            reject(new Error("Could not insert the guideline", error));
                        }
                    );
        } catch (error) {
            console.trace(`Guideline creation failed due error: ${error.message}`)
            reject(error);
        }
        console.groupEnd();
    });
}

/**
 * Update an existing guideline.
 * 
 * @param {GuidelineKey} guidelineKey The key of the guideline.
 * @param {GuidelineModel} guideline The new value of the guideline.
 * @returns {Promise<GuidelineModel>} The replaced guideline.
 */
export async function updateGuideline(guidelineKey, guideline) {
    return new Promise((resolve, reject) => {
        pool.query('UPDATE spell_guidelines ' + 
            'SET level=$1, name=$2, description=$3 ' + 
            'WHERE (style_id, form_id, technique_id)  = (' + 
            'SELECT style_id, form_id, art_id as technique_id, $3, $4, $5 ' +
            "FROM ( select style_id, art_id as form_id FROM formView where style = 'Hermetic' AND art = $1) AS form "+ 
            "NATURAL JOIN ( select style_id, art_id as technique_id from techniqueView where style = 'Hermetic' and art = $2) AS technique" + 
            ')', ['Hermetic', guidelineKey.form, guidelineKey.technique, guideline.level == null ? 0 : guideline.level, 
            guideline.name, guideline.description ?? null
        ]).then( 
            (result) => {
                resolve(result.rowCount > 0);
            }, 
            (error) => {
                reject(new NotFoundException("The guideline does not exist", error));
            }
        )
    });
}

/**
 * Remove an existing guideline.
 * 
 * @param {GuidelineKey|string} guidelineKey The guideline name or the guideline key of the removed
 * guideline. 
 * @returns {Promise<GuidelineModel|undefined>} The removed guideline.
 */
export async function removeGuideline(guidelineKey) {
    var index = -1;
    switch (typeof guidelineKey) {
        case "string":
            index = guidelines.findIndex( (/** @type {GuidelineModel} */ cursor) => (
                cursor.name === guidelineKey
            ));
            break;
        case "object":
            index = binarySearch(guidelines, guidelineKey, 0, guidelines.length,
                compareGuidelineKeys);
            break;
        default:
            return undefined;
    }
    if (index >= 0) {
        return Promise.resolve((guidelines.splice(index, 1))[0]);
    } else {
        return Promise.resolve(undefined);
    }
}

/**
 * An action handling submission of a create form action.
 * @param {FormData} formData The form data containing the guideline fields.
 */
export async function handleCreateGuideline(formData) {
    console.group("Handling create new spell request");
    const technique = formData.get("technique");
    const form = formData.get("form");
    const level = formData.get("level") ? new Number(formData.get("level")) : null;
    const name = formData.get("name");
    const descripton = formData.has("description") && formData.get("description") ? formData.get("description") : undefined;
    const created = new GuidelineModel(name, technique, form, level, descripton);
    console.log(`Adding guideline: ${guidelineKeyToString(created)}`);
    try {
        const guidelineKey = await addGuideline(created);
        console.log(`Created guideline ${guidelineKeyToString(created, true)}`);
        console.groupEnd();
        revalidatePath("/", "layout");
        return guidelineKey;
    } catch(error) {
        console.error(`Adding guideline failed: ${error.message}`);
        console.groupEnd();
        throw error;
    }
}