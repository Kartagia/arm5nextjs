
/**
 * @model actions/guidelines
 * 
 * The actions to get and alter the guidelines.
 */

import { compareIgnoreUndefined } from "./comparison.mjs";
import { artComparison, GuidelineModel, NotFoundException } from "./guidelines.mjs";

/**
 * The compare of levels.
 * @type {Compare<LevelType>}
 */
export const compareLevel = (compared, comparee) => (
    (compared === comparee || compared < comparee) ? 0 : compared === null ? -1 :
        (comparee === null || comparee < compared) ? 1 : undefined);

/**
 * Compare names.
 * 
 * @type {Compare<string>}  
 */
export const compareName = (compared, comparee) => (
    compared === comparee ? 0 : compared < comparee ? -1 : comparee < compared ? 1 : undefined
);

/**
 * The guideline key model.
 * 
 * @typedef {Pick<GuidelineModel, "technique"|"form"|"level"|"name">} GuidelineKey
 */

/**
 * Compare guidelines.
 *  
 * @type {Compare<GuidelineModel>} 
 */
const compareGuideline = (compared, comparee) => {
    if (compared == null || comparee == null) {
        return undefined;
    }
    var result = (artComparison)(compared.form, comparee.form);
    if (result === 0) {
        result = (artComparison)(compared.technique, comparee.technique);
    }
    if (result === 0) {
        result = (compareLevel)(compared.level, comparee.level);
    }
    if (result === 0) {
        result = (compareName)(compared.name, comparee.name);
    }
    return result;
}

/**
 * Compare guideline keys. Guideline keys comparison ignores missing fields, but uses
 * the comparison order of the guidelines. 
 * 
 * @type {Compare<Partial<GuidelineKey>>}
 */
const compareGuidelineKeys = (compared, comparee) => {
    if (compared == null || comparee == null) {
        return undefined;
    }
    var result = compareIgnoreUndefined(artComparison)(compared.form, comparee.form);
    if (result === 0) {
        result = compareIgnoreUndefined(artComparison)(compared.technique, comparee.technique);
    }
    if (result === 0) {
        result = compareIgnoreUndefined(compareLevel)(compared.level, comparee.level);
    }
    if (result === 0) {
        result = compareIgnoreUndefined(compareName)(compared.name, comparee.name);
    }
    return result;
}

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
    new GuidelineModel("Create an animal", "Creo", "Animal", 20, "Create a mundane animal"),
    new GuidelineModel("Destroy a specific kind of magical effect.", "Perdo", "Vim", null,
        "Destroy a specific kind (such a Hermetic spell of specific Form) of level (level + 2 magnitudes)/2")
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
 * Get guidelines.
 * @param {GuidelineFilter} [filter] The filter selecting some of the guidelines.
 * Defaults to a filter accepting all guidelines.
 * @returns {Promise<GuidelineModel[]>} 
 */
export async function getGuidelines(filter = () => (true)) {
    return Promise.resolve(guidelines.filter(guideline => filter(/** @type {GuidelineKey} */guideline)))
}

/**
 * Add guieline to the guidelines.
 * 
 * @param {GuidelineModel} guideline The added guideline.
 * @returns {Promise<GuidelineKey>} The guideline key of the created guideline.
 * @throws {RangeError} The guideline was invalid.
 */
export async function addGuideline(guideline) {
    try {
        const index = binarySearch(guidelines, guideline, 0, guidelines.length,
            compareGuidelineKeys);
        if (index >= 0) {
            return Promise.reject(new RangeError("The guideline already exists"));
        } else {
            guidelines.splice(-1 - index, 0, guideline);
            return Promise.resolve({
                name: guideline.name,
                level: guideline.level,
                technique: guideline.technique,
                form: guideline.form
            });
        }
    } catch (error) {
        return Promise.reject(error);
    }
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
        const index = binarySearch(guidelines, guideline, 0, undefined, compareGuidelineKeys);
        if (index >= 0) {
            resolve(guidelines.splice(index, 1, guideline)[0]);
        } else {
            reject(new NotFoundException("The guideline does not exist"));
        }
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