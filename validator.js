import { BlackjackGame } from "./blackjack.js";

const iterations = 30;

function Validate(state) {
    // TODO: Extract code, create N UI-less blackjack games, run them and see if they succeeded and what the results were 
    const gameState = [];
    for (let i = 0; i < iterations; i++) {
        const game = new BlackjackGame(false, state.control, state.ch1, state.ch2);
        game.runGame();
        gameState.push(game.gameState());
    }

    alert(gameState);

    // TODO: If validation succeeds, call a REST API to validate the code and fetch the puzzle answer.
    // WARNING: Puzzle answer below.  Don't spoil yourself.  For that matter why are you reading the
    // source code?  Stop that.
    return {
        success: true,
        msg: "Puzzle Answer Goes Here"
    }
}

export { Validate };