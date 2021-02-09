import { BlackjackGame } from "./blackjack.js";

const iterations = 30;

function Validate(state) {
    const gameState = [];
    for (let i = 0; i < iterations; i++) {
        const game = new BlackjackGame(false, state.control, state.ch1, state.ch2);
        game.toggleEdit();
        game.runGame();
        // TODO: If game didn't complete, fail early with the error
        gameState.push(game.gameState());
    }

    // TODO: Did dealer always bust?
    // TODO: Did dealer always have same score?
    // TODO: Did player always have same score?
    // TODO: Was dealer's shown card always the same?
    alert(gameState.map(function(g) { return JSON.stringify(g); }));

    // TODO: If valid program but player doesn't always win, return a message to that effect

    // TODO: If validation succeeds, call a REST API to validate the code and fetch the puzzle answer.
    // WARNING: Puzzle answer below.  Don't spoil yourself.  For that matter why are you reading the
    // source code?  Stop that.
    return {
        success: true,
        msg: "Puzzle Answer Goes Here"
    }
}

export { Validate };