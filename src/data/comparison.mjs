/**
 * A module containing various tools for comparison.
 * 
 * @module utils/comparison
 */

/**
 * The comparison result type.
 * - A negative integer, if compared is less than the comparee.
 * - A positive integer, if compared is greater than the comparee.
 * - A zero, if compared is equal to the comparee.
 * - An undefined value, if compared or comparee is not comparable with each other.
 * @typedef {-1|0|1|undefined} ComparisonResult
 */
/**
 * Compare values.
 *
 * @template TYPE the compared type.
 * @callback Compare
 * @param {TYPE} compared The compared value.
 * @param {TYPE} comparee The value compared with.
 * @returns {ComparisonResult} The comparison result:
 */


/**
 * Create a conditional compare, which returns specified fail value, if either compared or
 * comparee does not pass predicate.
 * 
 * @template [TYPE=any] The compared type.
 * @param {Compare<TYPE>} compare The comparison function used, if predicate both compared
 * and comparee passes the predicate.
 * @param {Predicate<TYPE>} predicate The predicate both compared and comparee must pass.
 * @param {ComparisonResult} [failValue=undefined] The comparison value, if either compared
 * or comparee fails the predicate.  
 * @returns {ComparisonResult} The comparison result.
 */
export function conditionalCompare(compare, predicate, failValue = undefined) {
    return (compared, comparee) => ( predicate(compared) && predicate(comparee) ? compare(compared, comparee) : failValue);
}

/**
 * @template TYPE
 * @template [COMPARED=TYPE]
 * @typedef {[Predicate<TYPE>, Compare<COMPARED>]} PredicateCompare
 */

/**
 * Create switch compare, which choose first suitable predicate-comparison pair.
 * - If the test does not check all values, the suitable pair is the first pair whose
 * predicate is passed.
 * - IF the test checks all, the suitable pair is the first pair giving inequality
 * result ot the compared and comparee.
 * 
 * @param {PredicateCompare<Partial<TYPE>, Partial<TYPE>>[]} predicateMapEntries
 * @param {boolean} [ignoreEquality=false] Does the testing continue after finding the
 * comparioson passign the predicate, if the compared and compree stays equals with it.
 * @default false
 * @returns {Compare<TYPE>} The comparison function choosing comparisons by the predicate.
 * If all comparisons are tested, the search for result continues until all entries are tested,
 * or inequality is found.
 */
export function switchCompare(predicateMapEntries, ignoreEquality = false) {
    return (compared, comparee) => (predicateMapEntries.reduce( 
        (result, [predicate, compare]) => (
        (ignoreEquality && result.value === 0 || !result.done) && predicate(compared)
        && predicate(comparee) ? {
            done: true, value: compare(compared, comparee) 
        }: result),
        {done: false, value: 0})).value;
}

/**
 * Create compare function ignoring undefined, but using given compare for defined values.
 *
 * @template [TYPE=any] The compared types.
 * @param {Compare<TYPE>} compare The comparison wrapped with ignore undefined.
 * @returns {Compare<TYPE|undefined>} The comparison function accepting undefined values
 * in addition to the compared types.
 */
export function compareIgnoreUndefined(compare) {
    return (/** @type {TYPE|undefined} */ compared, /** @type {TYPE|undefined} */ comparee) => {
        return (compared === undefined || comparee === undefined) ? 0 : compare(compared, comparee);
    };
}

/**
 * Create compare function ignoring null values, but using given compare for other values.
 *
 * @template TYPE=any The compared types.
 * @param {Compare<TYPE>} compare The comparison wrapped with ignore undefined.
 * @returns {Compare<TYPE|null>} The comparison function accepting null values
 * in addition to the compared types.
 */
export function compareIgnoreNull(compare)  {
    return (/** @type {TYPE|null} */ compared, /** @type {TYPE|null} */ comparee) => {
        return (compared === null || comparee === null) ? 0 : compare(compared, comparee);
    };
}
