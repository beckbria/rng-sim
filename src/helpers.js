/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = getRandomInt(i + 1);
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function getRandomInt(maxNonInclusive) {
    return Math.floor(Math.random() * Math.floor(maxNonInclusive));
}

function isLocalHost() {
    return (location.hostname === "localhost" || location.hostname === "127.0.0.1")
}

export { shuffleArray, getRandomInt, isLocalHost };