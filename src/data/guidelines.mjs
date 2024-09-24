
/**
 * @module model/guidelines
 * The guidelines related models.
 */

/**
 * @template [CAUSE=any] The cause of the error.
 * The exception indicating the resource was not found.
 */
export class NotFoundException extends Error {

    /**
     * Create a new not found exception.
     * 
     * @param {string} [message] The message of the exception. 
     * @param {CAUSE} [cause=undefined] The cause of the exception.
     */
    constructor(message = "Not found", cause = undefined) {
        super(message, cause);
        this.name = this.constructor.name;
    }
}

/**
 * The level type a guideline level.
 * @typedef {number|null} LevelType
 */

export class GuidelineModel {

    /**
     * The technique name.
     * 
     * @type {string}
     */
    #technique;

    /**
     * The form name.
     * 
     * @type {string}
     */
    #form;

    /**
     * The name of the guideline.
     * 
     * @type {string}
     */
    #name;

    /**
     * The optional description of the guideline mode.
     * 
     * @type {string|undefined}
     */
    #description;

    /**
     * The level of the guidelie.
     * The null value indicates the guideline is generic guideline.
     * @type {LevelType}
     */
    #level;

    /**
     * Create a new guideline model.
     * 
     * @param {string} technique The technique of the guideline.
     * @param {string} form The form of the guideline.
     * @param {string} name The name of the guideline. This is the first sentence of the guideline.
     * @param {LevelType} [level=null] The level of the guideline. @default null.
     * @param {string|undefined} [description] The optional additional description of the guideline.
     */
    constructor(name, technique, form, level=null, description = undefined) {
        this.#name = name;
        this.#form = form;
        this.#level  = level;
        this.#technique = technique;
        this.#description = description;
    }

    get name() {
        return this.#name;
    }

    get form() {
        return this.#form;
    }

    get technique() {
        return this.#technique;
    }

    get level() {
        return this.#level;
    }

    get description() {
        return this.#description;
    }

    get isGeneric() {
        return this.#level === null;
    }
}

/**
 * A model of group of guidelines or guideline groups.
 */
export class GuidelineGroupModel {

    /**
     * The name of the guideline group.
     * 
     * @type {string}
     */
    #name;

    /**
     * The members of the group.
     * @type {Array<GuidelineModel|GuidelineGroupModel>}
     */
    #members = [];

    /**
     * 
     * @param {string} name The group name. 
     * @param {Array<GuidelineModel|GuidelineGroupModel>} [members=[]] The initial
     * members of the group.
     * @throws {TypeError} Any type of any initial member was invalid.
     * @throws {RangeError} Any intiial members was invalid.
     */
    constructor(name, members=[]) {
        this.#name = name;
        members.forEach(member => this.addMember(member));
    }

    /**
     * The name of the group.
     */
    get name() {
        return this.#name;
    }

    /**
     * The members of the group.
     * 
     * @type {Readonly<Array<GuidelineGroupModel|GuidelineModel>>}
     */
    get members() {
        return [...this.#members];
    }

    /**
     * Test validity of a member.
     * @param {*} member The tested new member.
     * @param {number} [index] The index of the ignored member. 
     * @returns {boolean} True, if and only if the member is suiteable member.
     */
    validMember(member, index=-1) {
        if (member instanceof GuidelineGroupModel || member instanceof GuidelineModel) {
            const memberIndex = this.#members.indexOf( cursor => (cursor.name === member.name));
            return memberIndex < 0 || memberIndex === index;
        } else {
            return false;
        }
    }

    /**
     * Update an existing member.
     * 
     * @param {string|GuidelineGroupModel|GuidelineModel} memberRef The member reference. 
     * @param {GuidelineGroupModel|GuidelineModel} newMember The new member replacing the updated
     * member.
     * @returns {GuidelineGroupModel|GuidelineModel|undefined} The replaced member name. An undefined
     * value indicates a failure.
     * @throws {RangeError} The new member was not suitable replacement for the member ref.
     * @throws {NotFoundException} The given member reference does not exist.
     */
    updateMember(memberRef, newMember) {
        if (memberRef instanceof GuidelineGroupModel || memberRef instanceof GuidelineModel) {
            const index = this.#members.findIndex( cursor => (cursor.name === memberRef.name));
            if (!this.validMember(newMember, index)) {
                throw new RangeError("The new value member name is reserved by another member");
            }
            if (index < 0) {
                throw new NotFoundException("No member to update exists");
            } else {
                return this.#members.splice(index, 1, newMember)[0];
            }
        } else if (typeof memberRef === "string") {
            const index = this.#members.findIndex( cursor => (cursor.name === memberRef));
            if (!this.validMember(newMember, index)) {
                throw new RangeError("The new value member name is reserved by another member");
            }
            if (index < 0) {
                throw new NotFoundException("No member to update exists");
            } else {
                return this.#members.splice(index, 1, newMember)[0];
            }
        } else {
            throw new NotFoundException("No member to update exists");
        }        
    }

    /**
     * Add member to the group.
     * 
     * @param {GuidelineGroupModel|GuidelineModel} member The added member.
     * @throws {TypeError} The member type was invalid.
     * @throws {RangeError} The member was not suitable for the group. 
     */
    addMember(member) {
        if (member instanceof GuidelineGroupModel || member instanceof GuidelineModel) {
            if (this.validMember(member)) {
                // The duplicate name.
                throw new RangeError("Member name already used");
            }
            this.#members.push(member);
        } else {
            throw new TypeError("Invalid member");
        }
    }

    /**
     * Remove member from the group.
     * @param {string|GuidelineGroupModel|GuidelineModel} memberRef The removed member reference.
     * @returns {GuidelineGroupModel|GuidelineModel|undefined} The removed member.
     */
    removeMember(memberRef) {
        if (memberRef instanceof GuidelineGroupModel || memberRef instanceof GuidelineModel) {
            const index = this.#members.findIndex( cursor => (cursor.name === memberRef.name));
            if (index < 0) {
                return undefined;
            } else {
                return this.#members.splice(index, 1)[0];
            }
        } else if (typeof memberRef === "string") {
            const index = this.#members.findIndex( cursor => (cursor.name === memberRef));
            if (index < 0) {
                return undefined;
            } else {
                return this.#members.splice(index, 1)[0];
            }
        } else {
            return undefined;
        }
    }

    /**
     * Get first member of the group model.
     * 
     * @returns {GuidelineModel|GuidelineGroupModel|undefined} The first member
     * of the group, or an undefined value, if none exists.
     */
    getFirstMember() {
        if (this.#members > 0) {
            return this.#members[0];
        } else {
            return undefined;
        }
    }

    /**
     * Get last member of the group model.
     * 
     * @returns {GuidelineModel|GuidelineGroupModel|undefined} The last member
     * of the group, or an undefined value, if none exists.
     */
    getLastMember() {
        if (this.#members.length > 0) {
            return this.#members[this.#members.length-1];
        } else {
            return undefined;
        }
    }
}

/**
 * Test a value.
 * @template TYPE The tested type.
 * @callback Predicate
 * @param {TYPE} tested The tested value.
 * @returns {boolean} True, if and only if the tested fulfils the predicate.
 */
/**
 * Compare arts.
 *
 * @param {string} compared The compared art name.
 * @param {string} comparee The comparee art name.
 * @returns {ComparisonResult} The comparison result.
 */

export const artComparison = (/** @type {string} */ compared, /** @type {string} */ comparee) => /** @type {number|undefined} */(
    compared < comparee ? -1 : comparee < compared ? 1 : compared === comparee ? 0 : undefined
);
