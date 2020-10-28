const mongoose            = require('mongoose');
const utils               = require('../../utils/utils');
const {checkCustomFields} = require('../../utils/translation');
const utilsDatabase       = require('../../utils/database');
const Schema              = mongoose.Schema;

const StaticsSchema = new Schema({
    code         : {type: String, required: true, unique: true},
    type         : {type: String, required: true},
    active       : {type: Boolean, default: false},
    creationDate : {type: Date, default: Date.now},
    modifyDate   : {type: Date, default: Date.now},
    group        : {type: String, default: ''},
    // index        : {type: Boolean, default: true},
    translation  : {}
});

/* translation:
 title
 metaDesc
 slug, requis, unique entre les statics, pas entre ses langues
 content
 */

StaticsSchema.statics.translationValidation = async function (updateQuery, self) {
    let errors = [];

    if (updateQuery) {
        while (updateQuery.translation === undefined) {
            updateQuery.translation = {};
        }
        const languages       = await mongoose.model('languages').find({});
        const translationKeys = Object.keys(updateQuery.translation);
        for (const lang of languages) {
            if (!translationKeys.includes(lang.code)) {
                translationKeys.push(lang.code);
                updateQuery.translation[lang.code] = {slug: utils.slugify(updateQuery.code)};
            }
            if (!updateQuery.translation[lang.code].slug) {
                updateQuery.translation[lang.code].slug = updateQuery.translation[lang.code].title ? utils.slugify(updateQuery.translation[lang.code].title) : updateQuery.code;
            } else {
                updateQuery.translation[lang.code].slug = utils.slugify(updateQuery.translation[lang.code].slug);
            }
            if (await mongoose.model('statics').countDocuments({_id: {$ne: updateQuery._id}, [`translation.${lang.code}.slug`]: updateQuery.translation[lang.code].slug}) > 0) {
                errors.push('slug déjà existant');
            }
            errors = errors.concat(checkCustomFields(lang, 'translation.lationKeys[i]}', [
                {key: 'slug'}, {key: 'content'}, {key: 'title'}, {key: 'metaDesc'}
            ]));
        }
    } else {
        while (self.translation === undefined) {
            self.translation = {};
        }
        const translationKeys = Object.keys(self.translation);
        const languages       = await mongoose.model('languages').find({});
        for (const lang of languages) {
            if (!translationKeys.includes(lang.code)) {
                translationKeys.push(lang.code);
                self.translation[lang.code] = {slug: utils.slugify(self.code)};
            }
            if (!self.translation[lang.code].slug) {
                self.translation[lang.code].slug = self.translation[lang.code].title ? utils.slugify(self.translation[lang.code].title) : self.code;
            } else {
                self.translation[lang.code].slug = utils.slugify(self.translation[lang.code].slug);
            }
            if (await mongoose.model('statics').countDocuments({_id: {$ne: self._id}, [`translation.${lang.code}.slug`]: self.translation[lang.code].slug}) > 0) {
                errors.push('slug déjà existant');
            }
            errors = errors.concat(checkCustomFields(lang, 'translation.lationKeys[i]}', [
                {key: 'slug'}, {key: 'content'}, {key: 'title'}, {key: 'metaDesc'}
            ]));
        }
    }
    return errors;
};

StaticsSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, StaticsSchema);
});

StaticsSchema.pre('findOneAndUpdate', async function (next) {
    utilsDatabase.preUpdates(this, next, StaticsSchema);
});

StaticsSchema.pre('save', async function (next) {
    const errors    = await StaticsSchema.statics.translationValidation(undefined, this);
    this.modifyDate = new Date();
    next(errors.length > 0 ? new Error(errors.join('\n')) : undefined);
});

module.exports = StaticsSchema;