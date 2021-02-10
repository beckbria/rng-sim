import { BlackjackGame } from "./blackjack.js";
import { CardHandlerUnit } from "./chu.js";

function createFailure(msg, gameState = null) {
    const context = gameState == null ? "" : "\n\nExecution log:\n" + gameState.bjState + "\n\nInitial Deck:\n" + gameState.deck;

    return {
        success: false,
        msg: msg + context
    }
}

function createSuccess(msg) {
    return {
        success: true,
        msg: msg
    }
}

const iterations = 30;

function Validate(programs) {
    const gameState = [];
    for (let i = 0; i < iterations; i++) {
        const game = new BlackjackGame(false, programs.control, programs.ch1, programs.ch2);
        game.toggleEdit();
        game.runGame();
        const state = game.gameState();
        if (!state.complete) {
            let msg = "System failed to complete.  Errors: \n"
            if (state.controlError.length > 0) {
                msg = msg + "Control: " +state.controlError + "\n";
            }

            if (state.ch1Error.length > 0) {
                msg = msg + "CH1: " + state.ch1Error + "\n";
            }

            if (state.ch2Error.length > 0) {
                msg = msg + "CH2: " + state.ch2Error + "\n";
            }
            return createFailure(msg, game);
        }
        gameState.push(state);
    }

    // At this point we have 30 completed games.  Check their state
    let foundDifferentDealerCard = false;
    let foundDifferentDealerScore = false;
    let foundDifferentPlayerScore = false;
    let foundDealerDidNotBust = false;
    let lostGame = null;
    const first = gameState[0];
    for (const g of gameState) {
        foundDealerDidNotBust |= (g.dealerTotal <= 21);
        foundDifferentDealerCard |= (CardHandlerUnit.cardValueAdjusted(g.dealerCards[0]) != CardHandlerUnit.cardValueAdjusted(first.dealerCards[0]));
        foundDifferentDealerScore |= (g.dealerTotal != first.dealerTotal);
        foundDifferentPlayerScore |= (g.playerTotal != first.playerTotal);
        if (g.winner != 1) {
            lostGame = g;
        }
    }

    if (!foundDifferentDealerCard) {
        return createFailure("The dealer's shown card always had a value of " + CardHandlerUnit.cardValueAdjusted(first.dealerCards[0]));
    }
    if (!foundDifferentDealerScore) {
        return createFailure("The dealer's total was always " + first.dealerTotal);
    }
    if (!foundDifferentPlayerScore) {
        return createFailure("The dealer's total was always " + first.playerTotal);
    }
    if (!foundDealerDidNotBust) {
        return createFailure("The dealer always busted");
    }

    // At this point all the validation tests have passed, but we still have to check if the player always wins
    if (lostGame != null) {
        return createFailure("Validation passed, but the player did not always win.  Example of loss:\n\n", lostGame);
    }

    // TODO: If validation succeeds, call a REST API to validate the code and fetch the puzzle answer.
    // WARNING: Puzzle answer below.  Don't spoil yourself.  For that matter why are you reading the
    // source code?  Stop that.
    return createSuccess("PuzzleAnswerGoesHere")
}

export { Validate };