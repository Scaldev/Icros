const fs = require("fs");

module.exports = {

    checkName(word) {

        // First rule: first char is a letter or an underscore.
        let firstChar = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
        if (!firstChar.includes(word[0])) return false;

        // Second rule: every other char is a letter, an underscore or a number.
        let allowedCharacters = firstChar + "0123456789";
        for (let c in word) {
            if (!allowedCharacters.includes(word[c])) return false;
        }

        // Third rule: the word is not used by a word MySQL is using (ex: "INSERT").
        const contents = fs.readFileSync("./src/database/reserved_words.txt", 'utf-8');
        const array_words = contents.split(/\r?\n/);
        let isReserved = !array_words.includes(word.toUpperCase());
        return isReserved;

        // Will return false is the third rule is not respected, true otherwise.

    },

};